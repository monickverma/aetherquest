import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { db, users, type User } from "@/db";
import {
  SESSION_COOKIE,
  clearedSessionCookieOptions,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "./auth";

/** Node-only half of authentication: hashing, and resolving the current user. */

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function startSession(userId: string): Promise<void> {
  const token = await signSession(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", clearedSessionCookieOptions());
}

export async function currentUserId(): Promise<string | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  return session?.userId ?? null;
}

/**
 * Resolves the signed-in user, or null. The token is verified cryptographically
 * AND the row is re-read, so a deleted account cannot keep acting on a still
 * valid cookie.
 */
export async function currentUser(): Promise<User | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

/** Thrown by `requireUser`, translated to a 401 by the route error handler. */
export class UnauthorizedError extends Error {
  constructor() {
    super("You must be signed in to do that.");
    this.name = "UnauthorizedError";
  }
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
