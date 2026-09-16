import "server-only";

import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import {
  attributes,
  characters,
  db,
  deeds,
  inventory,
  items,
  quests,
  type Character,
  type User,
} from "@/db";
import {
  ATTRIBUTES,
  ATTRIBUTE_KEYS,
  computeAward,
  levelState,
  rankState,
  type AttributeKey,
  type Cadence,
  type DifficultyKey,
} from "./game";
import {
  previousDayKey,
  recentDayKeys,
  safeTimeZone,
  todayKey,
} from "./time";
import type {
  AttributeView,
  CharacterView,
  CodexStats,
  DayActivity,
  DeedView,
  ItemView,
  QuestView,
  Snapshot,
} from "./types";

export const ACTIVITY_WINDOW_DAYS = 14;

/**
 * The streak that the adventurer's NEXT completion would produce.
 * Used both to preview an award and to apply it, so the number shown on the
 * card is exactly the number that gets paid.
 */
export function projectedStreak(character: Character, timeZone: string): number {
  const today = todayKey(timeZone);
  if (character.lastActiveOn === today) return character.currentStreak;
  if (character.lastActiveOn === previousDayKey(today)) {
    return character.currentStreak + 1;
  }
  return 1;
}

/** The streak as it should be displayed: lapsed streaks read as 0. */
export function displayStreak(character: Character, timeZone: string): number {
  const today = todayKey(timeZone);
  if (character.lastActiveOn === today) return character.currentStreak;
  if (character.lastActiveOn === previousDayKey(today)) {
    return character.currentStreak;
  }
  return 0;
}

/**
 * Loads the character, creating it on first access. Registration already does
 * this, so the create path only fires for accounts that predate a schema change
 * — but it means the dashboard can never 500 on a missing character row.
 */
export async function ensureCharacter(
  userId: string,
  fallbackName: string,
): Promise<Character> {
  const [existing] = await db
    .select()
    .from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);

  if (existing) {
    await ensureAttributes(existing.id);
    return existing;
  }

  const characterId = crypto.randomUUID();
  await db.insert(characters).values({
    id: characterId,
    userId,
    name: fallbackName,
  });
  await ensureAttributes(characterId);

  const [created] = await db
    .select()
    .from(characters)
    .where(eq(characters.id, characterId))
    .limit(1);

  return created;
}

/** Guarantees exactly one row per attribute key, without disturbing existing XP. */
export async function ensureAttributes(characterId: string): Promise<void> {
  const rows = await db
    .select({ key: attributes.key })
    .from(attributes)
    .where(eq(attributes.characterId, characterId));

  const present = new Set(rows.map((r) => r.key));
  const missing = ATTRIBUTE_KEYS.filter((key) => !present.has(key));
  if (missing.length === 0) return;

  await db.insert(attributes).values(
    missing.map((key) => ({
      id: crypto.randomUUID(),
      characterId,
      key,
      xp: 0,
    })),
  );
}

async function loadAttributeViews(characterId: string): Promise<AttributeView[]> {
  const rows = await db
    .select()
    .from(attributes)
    .where(eq(attributes.characterId, characterId));

  const byKey = new Map(rows.map((r) => [r.key, r.xp]));

  return ATTRIBUTE_KEYS.map((key) => {
    const meta = ATTRIBUTES[key];
    const state = rankState(byKey.get(key) ?? 0);
    return {
      key,
      name: meta.name,
      blurb: meta.blurb,
      tone: meta.tone,
      xp: state.totalXp,
      rank: state.rank,
      title: state.title,
      xpIntoRank: state.xpIntoRank,
      xpForNextRank: state.xpForNextRank,
      progress: state.progress,
      isMaxRank: state.isMaxRank,
    };
  });
}

export function toQuestView(
  quest: typeof quests.$inferSelect,
  today: string,
  streakForAward: number,
): QuestView {
  const difficulty = quest.difficulty as DifficultyKey;
  const award = computeAward(difficulty, streakForAward);
  const isComplete =
    quest.cadence === "once"
      ? quest.completedAt !== null
      : quest.lastCompletedOn === today;

  return {
    id: quest.id,
    title: quest.title,
    notes: quest.notes,
    attribute: quest.attribute as AttributeKey,
    difficulty,
    cadence: quest.cadence as Cadence,
    status: quest.status as "active" | "archived",
    sortOrder: quest.sortOrder,
    createdAt: quest.createdAt,
    isComplete,
    lastCompletedOn: quest.lastCompletedOn,
    completedAt: quest.completedAt,
    award: { xp: award.xp, gold: award.gold },
  };
}

async function loadActivity(
  userId: string,
  timeZone: string,
): Promise<DayActivity[]> {
  const days = recentDayKeys(timeZone, ACTIVITY_WINDOW_DAYS);
  const earliest = days[days.length - 1];

  const rows = await db
    .select({
      day: deeds.completedOn,
      deeds: sql<number>`count(*)`,
      xp: sql<number>`coalesce(sum(${deeds.xpAwarded}), 0)`,
    })
    .from(deeds)
    .where(and(eq(deeds.userId, userId), gte(deeds.completedOn, earliest)))
    .groupBy(deeds.completedOn);

  const byDay = new Map(rows.map((r) => [r.day, r]));

  // Oldest-first, so the ribbon reads left to right.
  return days
    .slice()
    .reverse()
    .map((day) => ({
      day,
      deeds: Number(byDay.get(day)?.deeds ?? 0),
      xp: Number(byDay.get(day)?.xp ?? 0),
    }));
}

type Equipped = { titleName: string | null; sigilGlyph: string | null };

/**
 * The character row stores item slugs ("sigil-moth"); the interface needs the
 * title's display name and the sigil's glyph id ("moth"). Both are resolved in
 * a single query.
 */
async function resolveEquipped(character: Character): Promise<Equipped> {
  const slugs = [character.equippedTitle, character.equippedSigil].filter(
    (slug): slug is string => Boolean(slug),
  );
  if (slugs.length === 0) return { titleName: null, sigilGlyph: null };

  const rows = await db
    .select({ id: items.id, name: items.name, glyph: items.glyph })
    .from(items)
    .where(inArray(items.id, slugs));

  const byId = new Map(rows.map((row) => [row.id, row]));
  return {
    titleName: character.equippedTitle
      ? (byId.get(character.equippedTitle)?.name ?? null)
      : null,
    sigilGlyph: character.equippedSigil
      ? (byId.get(character.equippedSigil)?.glyph ?? null)
      : null,
  };
}

export function toCharacterView(
  character: Character,
  timeZone: string,
  equipped: Equipped,
): CharacterView {
  const level = levelState(character.xp);
  return {
    name: character.name,
    level: level.level,
    xp: level.totalXp,
    xpIntoLevel: level.xpIntoLevel,
    xpForNextLevel: level.xpForNextLevel,
    progress: level.progress,
    isMaxLevel: level.isMaxLevel,
    gold: character.gold,
    streak: displayStreak(character, timeZone),
    longestStreak: character.longestStreak,
    lastActiveOn: character.lastActiveOn,
    title: equipped.titleName,
    sigil: equipped.sigilGlyph,
  };
}

/** The single payload the dashboard renders from. */
export async function buildSnapshot(user: User): Promise<Snapshot> {
  const timeZone = safeTimeZone(user.timezone);
  const character = await ensureCharacter(user.id, user.displayName);
  const today = todayKey(timeZone);
  const streakForAward = projectedStreak(character, timeZone);

  const [attributeViews, questRows, activity, equipped, totalsRow] =
    await Promise.all([
      loadAttributeViews(character.id),
      db
        .select()
        .from(quests)
        .where(and(eq(quests.userId, user.id), eq(quests.status, "active")))
        .orderBy(asc(quests.sortOrder), desc(quests.createdAt)),
      loadActivity(user.id, timeZone),
      resolveEquipped(character),
      db
        .select({ total: sql<number>`count(*)` })
        .from(deeds)
        .where(eq(deeds.userId, user.id)),
    ]);

  const todayActivity = activity.find((d) => d.day === today);

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      timezone: timeZone,
    },
    character: toCharacterView(character, timeZone, equipped),
    attributes: attributeViews,
    quests: questRows.map((q) => toQuestView(q, today, streakForAward)),
    today,
    activity,
    totals: {
      deeds: Number(totalsRow[0]?.total ?? 0),
      xpToday: todayActivity?.xp ?? 0,
      deedsToday: todayActivity?.deeds ?? 0,
    },
  };
}

/* ── codex ─────────────────────────────────────────────────── */

export const CODEX_PAGE_SIZE = 40;

export async function loadDeeds(
  userId: string,
  page = 0,
): Promise<{ deeds: DeedView[]; hasMore: boolean }> {
  const rows = await db
    .select()
    .from(deeds)
    .where(eq(deeds.userId, userId))
    .orderBy(desc(deeds.createdAt))
    .limit(CODEX_PAGE_SIZE + 1)
    .offset(page * CODEX_PAGE_SIZE);

  const hasMore = rows.length > CODEX_PAGE_SIZE;

  return {
    hasMore,
    deeds: rows.slice(0, CODEX_PAGE_SIZE).map((d) => ({
      id: d.id,
      questTitle: d.questTitle,
      attribute: d.attribute as AttributeKey,
      difficulty: d.difficulty as DifficultyKey,
      xpAwarded: d.xpAwarded,
      goldAwarded: d.goldAwarded,
      streakBonusPct: d.streakBonusPct,
      completedOn: d.completedOn,
      createdAt: d.createdAt,
    })),
  };
}

/** The summary that sits above the ledger. */
export async function loadCodexStats(userId: string): Promise<CodexStats> {
  const [[totals], [days], [best], byAttribute] = await Promise.all([
    db
      .select({
        deeds: sql<number>`count(*)`,
        xp: sql<number>`coalesce(sum(${deeds.xpAwarded}), 0)`,
        gold: sql<number>`coalesce(sum(${deeds.goldAwarded}), 0)`,
      })
      .from(deeds)
      .where(eq(deeds.userId, userId)),
    db
      .select({ days: sql<number>`count(distinct ${deeds.completedOn})` })
      .from(deeds)
      .where(eq(deeds.userId, userId)),
    db
      .select({ day: deeds.completedOn, deeds: sql<number>`count(*)` })
      .from(deeds)
      .where(eq(deeds.userId, userId))
      .groupBy(deeds.completedOn)
      .orderBy(desc(sql`count(*)`))
      .limit(1),
    db
      .select({ key: deeds.attribute, deeds: sql<number>`count(*)` })
      .from(deeds)
      .where(eq(deeds.userId, userId))
      .groupBy(deeds.attribute),
  ]);

  const counts = new Map(byAttribute.map((r) => [r.key, Number(r.deeds)]));

  return {
    deeds: Number(totals?.deeds ?? 0),
    xp: Number(totals?.xp ?? 0),
    gold: Number(totals?.gold ?? 0),
    daysRecorded: Number(days?.days ?? 0),
    bestDay: best ? { day: best.day, deeds: Number(best.deeds) } : null,
    byAttribute: ATTRIBUTE_KEYS.map((key) => ({
      key,
      name: ATTRIBUTES[key].name,
      tone: ATTRIBUTES[key].tone,
      deeds: counts.get(key) ?? 0,
    })),
  };
}

/* ── vault ─────────────────────────────────────────────────── */

export async function loadVault(user: User): Promise<{
  items: ItemView[];
  gold: number;
  level: number;
}> {
  const character = await ensureCharacter(user.id, user.displayName);
  const level = levelState(character.xp).level;

  const [catalogue, owned] = await Promise.all([
    db.select().from(items).orderBy(asc(items.sortOrder), asc(items.price)),
    db
      .select({ itemId: inventory.itemId })
      .from(inventory)
      .where(eq(inventory.userId, user.id)),
  ]);

  const ownedIds = new Set(owned.map((o) => o.itemId));

  const views: ItemView[] = catalogue.map((item) => {
    const isOwned = ownedIds.has(item.id);
    const equipped =
      character.equippedTitle === item.id || character.equippedSigil === item.id;

    let lockedReason: string | null = null;
    if (!isOwned) {
      if (level < item.requiredLevel) {
        lockedReason = `Requires level ${item.requiredLevel}`;
      } else if (character.gold < item.price) {
        lockedReason = `Needs ${item.price - character.gold} more gold`;
      }
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      kind: item.kind as ItemView["kind"],
      rarity: item.rarity as ItemView["rarity"],
      price: item.price,
      requiredLevel: item.requiredLevel,
      glyph: item.glyph,
      owned: isOwned,
      equipped,
      lockedReason,
    };
  });

  return { items: views, gold: character.gold, level };
}
