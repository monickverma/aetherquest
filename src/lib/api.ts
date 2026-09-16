import { createHash } from "node:crypto";

import { lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db, rateLimits } from "@/db";
import { UnauthorizedError } from "./session";
import { firstIssue } from "./validation";

/**
 * One response shape for the whole API:
 *   success -> { ok: true,  ...data }
 *   failure -> { ok: false, error: "a sentence the user can read" }
 *
 * Errors are always human-readable because the UI renders `error` directly.
 * Nothing internal (stack traces, SQL, constraint names) ever crosses this line.
 */

export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Wraps a route handler so every thrown error becomes a clean JSON response. */
export async function handle(
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return fail(error.message, 401);
    }
    if (error instanceof AppError) {
      return fail(error.message, error.status);
    }
    if (error instanceof z.ZodError) {
      return fail(firstIssue(error), 422);
    }
    // Unexpected: log the detail server-side, tell the user nothing specific.
    console.error("[api] unhandled error:", error);
    return fail(
      "Something went wrong on our side. Your progress is safe — try again.",
      500,
    );
  }
}

/** Parses and validates a JSON body, or throws an AppError the user can read. */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError("That request was not valid JSON.", 400);
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(firstIssue(parsed.error), 422);
  }
  return parsed.data;
}

/* ── rate limiting ─────────────────────────────────────────────
   Fixed-window counters for the auth endpoints, kept in the
   database. An in-memory Map would be per-process, and a serverless
   deployment spreads requests across many short-lived instances, so
   no single counter would ever reach the limit.

   Each attempt is one atomic UPSERT ... RETURNING: it either opens a
   fresh window or increments the live one, and hands back the count
   in the same round trip, so concurrent attempts cannot race past
   the limit. Keys are SHA-256 hashes, so no raw IP is ever stored.
   ──────────────────────────────────────────────────────────── */

/**
 * The client's address. On Vercel `x-forwarded-for` is overwritten at the
 * edge with the real client IP (external values are not forwarded), so it
 * cannot be spoofed there. Locally it falls back to a shared bucket.
 */
function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

function bucketKey(scope: string, ip: string, subject: string): string {
  return createHash("sha256").update(JSON.stringify([scope, ip, subject])).digest("hex");
}

/**
 * Counts one attempt against a window, throwing a 429 once `limit` is passed.
 * `subject` narrows the bucket further, e.g. to one account from one address,
 * so a single mistyped password never counts against a whole shared network.
 */
export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  subject = "",
): Promise<void> {
  const key = bucketKey(scope, clientIp(request), subject.toLowerCase());
  const now = Date.now();

  const [bucket] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: now + windowMs })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        // Both expressions read the row as it was before this update.
        count: sql`case when ${rateLimits.resetAt} <= ${now} then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} <= ${now} then ${now + windowMs} else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

  // Opportunistic sweep of closed windows, so the table stays small.
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(lt(rateLimits.resetAt, now));
  }

  if (bucket && bucket.count > limit) {
    const seconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new AppError(`Too many attempts. Try again in ${seconds} seconds.`, 429);
  }
}
