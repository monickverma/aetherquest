/**
 * Environment access.
 *
 * Reads are lazy and throw a useful message at call time rather than at import
 * time, so `next build` still works in environments where secrets are injected
 * later (Vercel builds the app before runtime env is bound in some setups).
 */

function required(name: string, value: string | undefined, hint: string): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. ${hint} See .env.example.`,
    );
  }
  return value;
}

export function authSecret(): Uint8Array {
  const secret = required(
    "AUTH_SECRET",
    process.env.AUTH_SECRET,
    "It signs session cookies.",
  );
  if (secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48",
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * `TURSO_*` are the names Vercel's Turso Marketplace integration injects, so a
 * database added from the Vercel dashboard works with no manual env setup.
 */
export function databaseUrl(): string {
  return required(
    "DATABASE_URL",
    process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL,
    'Use "file:./data/aetherquest.db" locally, or a libsql:// URL in production.',
  );
}

export function databaseAuthToken(): string | undefined {
  const token = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
  return token && token.trim() !== "" ? token : undefined;
}

export const isProduction = process.env.NODE_ENV === "production";

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined) ??
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
