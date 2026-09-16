import { eq } from "drizzle-orm";

import { db, users } from "@/db";
import { AppError, enforceRateLimit, handle, ok, readJson } from "@/lib/api";
import { buildSnapshot } from "@/lib/queries";
import { startSession, verifyPassword } from "@/lib/session";
import { isValidTimeZone } from "@/lib/time";
import { loginSchema } from "@/lib/validation";

/**
 * A real bcrypt hash (cost 12) of a random throwaway string. When no account
 * matches, the password is compared against this instead of returning early,
 * so a missing email costs the same wall-clock time as a wrong passphrase and
 * cannot be discovered by timing the response.
 */
const DUMMY_HASH =
  "$2b$12$ZAlWvTC8vi3aadiwbwmldOIVdr5nNDqX2J9YvYZPibihiARuAeq6i";

export async function POST(request: Request) {
  return handle(async () => {
    enforceRateLimit(request, "login", 10, 10 * 60 * 1000);

    const input = await readJson(request, loginSchema);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    const passwordOk = await verifyPassword(
      input.password,
      user?.passwordHash ?? DUMMY_HASH,
    );

    // One message for both failure modes: never confirm an email exists.
    if (!user || !passwordOk) {
      throw new AppError("That email and passphrase do not match.", 401);
    }

    // Keep the stored timezone current, so streaks follow the traveller.
    if (input.timezone && isValidTimeZone(input.timezone) && input.timezone !== user.timezone) {
      await db
        .update(users)
        .set({ timezone: input.timezone })
        .where(eq(users.id, user.id));
      user.timezone = input.timezone;
    }

    await startSession(user.id);

    return ok({ snapshot: await buildSnapshot(user) });
  });
}
