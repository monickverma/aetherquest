import "server-only";

import { and, desc, eq, isNull, ne, or, sql } from "drizzle-orm";

import {
  attributes,
  characters,
  db,
  deeds,
  inventory,
  items,
  quests,
  type User,
} from "@/db";
import { AppError } from "./api";
import {
  ATTRIBUTES,
  computeAward,
  levelFromXp,
  rankState,
  type AttributeKey,
  type DifficultyKey,
} from "./game";
import {
  buildSnapshot,
  ensureCharacter,
  projectedStreak,
} from "./queries";
import { safeTimeZone, todayKey } from "./time";
import type { CompletionResult } from "./types";
import type { CreateQuestInput, UpdateQuestInput } from "./validation";

/**
 * All state-changing game logic.
 *
 * The security model in one line: the client names a quest, the server decides
 * what it is worth. No request body carries an XP or gold figure, so there is
 * nothing to inflate. Completion guards are written as conditional UPDATEs with
 * RETURNING, which makes them atomic — a double-clicked button or two tabs
 * racing each other can only ever produce one award.
 */

const nowSeconds = () => Math.floor(Date.now() / 1000);

/* ── quests: create / update / delete ──────────────────────── */

export async function createQuest(user: User, input: CreateQuestInput) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(quests)
    .where(and(eq(quests.userId, user.id), eq(quests.status, "active")));

  if (Number(count) >= 100) {
    throw new AppError(
      "Your quest log is full at 100 active quests. Archive a few first.",
      409,
    );
  }

  const [created] = await db
    .insert(quests)
    .values({
      id: crypto.randomUUID(),
      userId: user.id,
      title: input.title,
      notes: input.notes?.trim() || null,
      attribute: input.attribute,
      difficulty: input.difficulty,
      cadence: input.cadence,
      // New quests land at the top of the log.
      sortOrder: -nowSeconds(),
    })
    .returning();

  return created;
}

export async function updateQuest(
  user: User,
  questId: string,
  input: UpdateQuestInput,
) {
  const patch: Record<string, unknown> = { updatedAt: nowSeconds() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.attribute !== undefined) patch.attribute = input.attribute;
  if (input.difficulty !== undefined) patch.difficulty = input.difficulty;
  if (input.cadence !== undefined) patch.cadence = input.cadence;
  if (input.status !== undefined) patch.status = input.status;

  const updated = await db
    .update(quests)
    .set(patch)
    .where(and(eq(quests.id, questId), eq(quests.userId, user.id)))
    .returning();

  if (updated.length === 0) {
    throw new AppError("That quest is not in your log.", 404);
  }
  return updated[0];
}

export async function deleteQuest(user: User, questId: string) {
  const removed = await db
    .delete(quests)
    .where(and(eq(quests.id, questId), eq(quests.userId, user.id)))
    .returning({ id: quests.id });

  if (removed.length === 0) {
    throw new AppError("That quest is not in your log.", 404);
  }
  // The deed ledger keeps its snapshot of the title, so history survives.
}

/* ── quests: completion ────────────────────────────────────── */

export async function completeQuest(
  user: User,
  questId: string,
): Promise<CompletionResult> {
  const timeZone = safeTimeZone(user.timezone);
  const today = todayKey(timeZone);

  const [quest] = await db
    .select()
    .from(quests)
    .where(and(eq(quests.id, questId), eq(quests.userId, user.id)))
    .limit(1);

  if (!quest) throw new AppError("That quest is not in your log.", 404);
  if (quest.status !== "active") {
    throw new AppError("That quest is archived. Restore it first.", 409);
  }

  const character = await ensureCharacter(user.id, user.displayName);
  const newStreak = projectedStreak(character, timeZone);
  const difficulty = quest.difficulty as DifficultyKey;
  const attributeKey = quest.attribute as AttributeKey;
  const award = computeAward(difficulty, newStreak);

  const xpBefore = character.xp;
  const levelBefore = levelFromXp(xpBefore);

  const [attributeRow] = await db
    .select()
    .from(attributes)
    .where(
      and(
        eq(attributes.characterId, character.id),
        eq(attributes.key, attributeKey),
      ),
    )
    .limit(1);

  const rankBefore = rankState(attributeRow?.xp ?? 0).rank;

  await db.transaction(async (tx) => {
    // Atomic claim: succeeds only if the quest is not already satisfied.
    // A second concurrent request updates zero rows and is rejected below.
    const claimed = await tx
      .update(quests)
      .set(
        quest.cadence === "once"
          ? { completedAt: nowSeconds(), updatedAt: nowSeconds() }
          : { lastCompletedOn: today, updatedAt: nowSeconds() },
      )
      .where(
        and(
          eq(quests.id, questId),
          eq(quests.userId, user.id),
          quest.cadence === "once"
            ? isNull(quests.completedAt)
            : or(
                isNull(quests.lastCompletedOn),
                ne(quests.lastCompletedOn, today),
              ),
        ),
      )
      .returning({ id: quests.id });

    if (claimed.length === 0) {
      throw new AppError(
        quest.cadence === "once"
          ? "That quest is already finished."
          : "You have already completed that quest today. It returns tomorrow.",
        409,
      );
    }

    await tx
      .update(characters)
      .set({
        xp: sql`${characters.xp} + ${award.xp}`,
        gold: sql`${characters.gold} + ${award.gold}`,
        currentStreak: newStreak,
        longestStreak: sql`max(${characters.longestStreak}, ${newStreak})`,
        lastActiveOn: today,
      })
      .where(eq(characters.id, character.id));

    await tx
      .update(attributes)
      .set({ xp: sql`${attributes.xp} + ${award.xp}` })
      .where(
        and(
          eq(attributes.characterId, character.id),
          eq(attributes.key, attributeKey),
        ),
      );

    await tx.insert(deeds).values({
      id: crypto.randomUUID(),
      userId: user.id,
      questId: quest.id,
      questTitle: quest.title,
      attribute: attributeKey,
      difficulty,
      xpAwarded: award.xp,
      goldAwarded: award.gold,
      streakBonusPct: award.streakBonusPct,
      completedOn: today,
    });
  });

  const levelAfter = levelFromXp(xpBefore + award.xp);
  const rankAfter = rankState((attributeRow?.xp ?? 0) + award.xp).rank;
  const streakExtended =
    newStreak > character.currentStreak ||
    character.lastActiveOn !== today;

  return {
    snapshot: await buildSnapshot(user),
    award: {
      xp: award.xp,
      gold: award.gold,
      streakBonusPct: award.streakBonusPct,
    },
    leveledUpTo: levelAfter > levelBefore ? levelAfter : null,
    rankedUp:
      rankAfter > rankBefore
        ? {
            attribute: attributeKey,
            name: ATTRIBUTES[attributeKey].name,
            rank: rankAfter,
          }
        : null,
    streakExtendedTo: streakExtended ? newStreak : null,
  };
}

/**
 * Undoes today's completion of a quest: the ledger entry is removed and the XP
 * and gold are taken back. Gold is clamped at zero, because it may already have
 * been spent in the Vault — an undo can never leave a negative balance.
 */
export async function undoCompletion(user: User, questId: string) {
  const timeZone = safeTimeZone(user.timezone);
  const today = todayKey(timeZone);
  const character = await ensureCharacter(user.id, user.displayName);

  const [deed] = await db
    .select()
    .from(deeds)
    .where(
      and(
        eq(deeds.userId, user.id),
        eq(deeds.questId, questId),
        eq(deeds.completedOn, today),
      ),
    )
    .orderBy(desc(deeds.createdAt))
    .limit(1);

  if (!deed) {
    throw new AppError("There is nothing to undo for that quest today.", 409);
  }

  await db.transaction(async (tx) => {
    const removed = await tx
      .delete(deeds)
      .where(eq(deeds.id, deed.id))
      .returning({ id: deeds.id });

    // Another request already undid it.
    if (removed.length === 0) {
      throw new AppError("There is nothing to undo for that quest today.", 409);
    }

    await tx
      .update(quests)
      .set({
        completedAt: null,
        lastCompletedOn: null,
        updatedAt: nowSeconds(),
      })
      .where(and(eq(quests.id, questId), eq(quests.userId, user.id)));

    await tx
      .update(characters)
      .set({
        xp: sql`max(0, ${characters.xp} - ${deed.xpAwarded})`,
        gold: sql`max(0, ${characters.gold} - ${deed.goldAwarded})`,
      })
      .where(eq(characters.id, character.id));

    await tx
      .update(attributes)
      .set({ xp: sql`max(0, ${attributes.xp} - ${deed.xpAwarded})` })
      .where(
        and(
          eq(attributes.characterId, character.id),
          eq(attributes.key, deed.attribute),
        ),
      );

    // If that was the last deed of the day, the streak did not really happen.
    const [{ remaining }] = await tx
      .select({ remaining: sql<number>`count(*)` })
      .from(deeds)
      .where(
        and(eq(deeds.userId, user.id), eq(deeds.completedOn, today)),
      );

    if (Number(remaining) === 0) {
      const [previous] = await tx
        .select({ day: deeds.completedOn })
        .from(deeds)
        .where(eq(deeds.userId, user.id))
        .orderBy(desc(deeds.completedOn))
        .limit(1);

      await tx
        .update(characters)
        .set({
          currentStreak: sql`max(0, ${characters.currentStreak} - 1)`,
          lastActiveOn: previous?.day ?? null,
        })
        .where(eq(characters.id, character.id));
    }
  });

  return buildSnapshot(user);
}

/* ── the vault: buying and equipping ───────────────────────── */

export async function buyItem(user: User, itemId: string) {
  const character = await ensureCharacter(user.id, user.displayName);

  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);

  if (!item) throw new AppError("No such item is for sale.", 404);

  const [alreadyOwned] = await db
    .select({ id: inventory.id })
    .from(inventory)
    .where(
      and(eq(inventory.userId, user.id), eq(inventory.itemId, item.id)),
    )
    .limit(1);

  if (alreadyOwned) {
    throw new AppError("That is already yours.", 409);
  }

  const level = levelFromXp(character.xp);
  if (level < item.requiredLevel) {
    throw new AppError(
      `${item.name} is sealed until level ${item.requiredLevel}.`,
      403,
    );
  }

  await db.transaction(async (tx) => {
    // Conditional debit: the `gold >= price` guard lives in the WHERE clause,
    // so two simultaneous purchases cannot both succeed on the same coins.
    const debited = await tx
      .update(characters)
      .set({ gold: sql`${characters.gold} - ${item.price}` })
      .where(
        and(
          eq(characters.id, character.id),
          sql`${characters.gold} >= ${item.price}`,
        ),
      )
      .returning({ gold: characters.gold });

    if (debited.length === 0) {
      throw new AppError(
        `You need ${item.price - character.gold} more gold for ${item.name}.`,
        402,
      );
    }

    await tx.insert(inventory).values({
      id: crypto.randomUUID(),
      userId: user.id,
      itemId: item.id,
      pricePaid: item.price,
    });
  });

  return { item, snapshot: await buildSnapshot(user) };
}

export async function equipItem(
  user: User,
  slot: "title" | "sigil",
  itemId: string | null,
) {
  const character = await ensureCharacter(user.id, user.displayName);

  if (itemId !== null) {
    const [owned] = await db
      .select({ kind: items.kind })
      .from(inventory)
      .innerJoin(items, eq(items.id, inventory.itemId))
      .where(and(eq(inventory.userId, user.id), eq(inventory.itemId, itemId)))
      .limit(1);

    if (!owned) {
      throw new AppError("You do not own that item.", 403);
    }
    if (owned.kind !== slot) {
      throw new AppError(`That item cannot be worn as a ${slot}.`, 400);
    }
  }

  await db
    .update(characters)
    .set(
      slot === "title"
        ? { equippedTitle: itemId }
        : { equippedSigil: itemId },
    )
    .where(eq(characters.id, character.id));

  return buildSnapshot(user);
}

export async function renameCharacter(user: User, name: string) {
  const character = await ensureCharacter(user.id, user.displayName);
  await db
    .update(characters)
    .set({ name })
    .where(eq(characters.id, character.id));
  return buildSnapshot(user);
}
