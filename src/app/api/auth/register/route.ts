import { eq } from "drizzle-orm";

import { attributes, characters, db, quests, users } from "@/db";
import { AppError, enforceRateLimit, handle, ok, readJson } from "@/lib/api";
import { ATTRIBUTE_KEYS } from "@/lib/game";
import { buildSnapshot } from "@/lib/queries";
import { hashPassword, startSession } from "@/lib/session";
import { safeTimeZone } from "@/lib/time";
import { registerSchema } from "@/lib/validation";

/** Four example quests, so a new adventurer never meets an empty log. */
const STARTER_QUESTS = [
  {
    title: "Move your body for 30 minutes",
    notes: "Walk, lift, stretch, dance. It all counts.",
    attribute: "might" as const,
    difficulty: "standard" as const,
  },
  {
    title: "Read 20 pages",
    notes: "Anything that leaves you smarter than it found you.",
    attribute: "intellect" as const,
    difficulty: "standard" as const,
  },
  {
    title: "Make the bed before leaving the room",
    notes: "The smallest possible act of order.",
    attribute: "discipline" as const,
    difficulty: "trivial" as const,
  },
  {
    title: "Drink two litres of water",
    notes: null,
    attribute: "vitality" as const,
    difficulty: "easy" as const,
  },
];

export async function POST(request: Request) {
  return handle(async () => {
    enforceRateLimit(request, "register", 8, 10 * 60 * 1000);

    const input = await readJson(request, registerSchema);

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existing) {
      throw new AppError(
        "An adventurer already carries that email. Try signing in instead.",
        409,
      );
    }

    const userId = crypto.randomUUID();
    const characterId = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);
    const timezone = safeTimeZone(input.timezone);
    const now = Math.floor(Date.now() / 1000);

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        timezone,
      });

      await tx.insert(characters).values({
        id: characterId,
        userId,
        name: input.displayName,
      });

      await tx.insert(attributes).values(
        ATTRIBUTE_KEYS.map((key) => ({
          id: crypto.randomUUID(),
          characterId,
          key,
          xp: 0,
        })),
      );

      await tx.insert(quests).values(
        STARTER_QUESTS.map((q, i) => ({
          id: crypto.randomUUID(),
          userId,
          title: q.title,
          notes: q.notes,
          attribute: q.attribute,
          difficulty: q.difficulty,
          cadence: "daily" as const,
          sortOrder: -now + i,
        })),
      );
    });

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    await startSession(userId);

    return ok({ snapshot: await buildSnapshot(user) }, 201);
  });
}
