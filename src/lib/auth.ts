import { SignJWT, jwtVerify } from "jose";

import { authSecret, isProduction } from "./env";

/**
 * Runtime-agnostic half of authentication: signing and verifying the session
 * token. This module deliberately imports neither the database nor bcrypt, so
 * the request proxy can use it without pulling either into its bundle.
 */

export const SESSION_COOKIE = "aq_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const ISSUER = "aetherquest";
const AUDIENCE = "aetherquest:web";

export type SessionPayload = { userId: string };

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(authSecret());
}

export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, authSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return typeof payload.sub === "string" ? { userId: payload.sub } : null;
  } catch {
    // Expired, tampered with, or signed by a rotated secret — all mean "logged out".
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function clearedSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 };
}
