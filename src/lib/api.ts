import { NextResponse } from "next/server";
import { z } from "zod";

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
   A deliberately small in-memory limiter for the auth endpoints:
   enough to blunt credential stuffing against a single instance.
   It is per-process, so on a multi-instance deployment it is a
   speed bump rather than a guarantee — see the README.
   ──────────────────────────────────────────────────────────── */

type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as {
  __aetherquestBuckets?: Map<string, Bucket>;
};

const buckets =
  globalForLimiter.__aetherquestBuckets ??
  (globalForLimiter.__aetherquestBuckets = new Map<string, Bucket>());

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic sweep so the map cannot grow without bound.
    if (buckets.size > 5_000) {
      for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Best-effort client identity for rate limiting. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "local";
  return `${scope}:${ip}`;
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): void {
  const { allowed, retryAfterSeconds } = rateLimit(
    clientKey(request, scope),
    limit,
    windowMs,
  );
  if (!allowed) {
    throw new AppError(
      `Too many attempts. Try again in ${retryAfterSeconds} seconds.`,
      429,
    );
  }
}
