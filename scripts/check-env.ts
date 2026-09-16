/**
 * Pre-build guard for deployments.
 *
 * On Vercel, a missing database or secret would otherwise produce a build that
 * succeeds and then fails on every request. This stops the build first, with
 * instructions, instead. Locally it does nothing: `.env.local` covers it.
 */

const onVercel = process.env.VERCEL === "1";

if (!onVercel) {
  console.log("check-env: not a Vercel build, skipping.");
  process.exit(0);
}

const problems: string[] = [];

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "";
const token = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "";
const secret = process.env.AUTH_SECRET || "";

if (!url) {
  problems.push(
    "No database is configured. In the Vercel project open Storage → Create Database → Turso " +
      "(this sets TURSO_DATABASE_URL and TURSO_AUTH_TOKEN), or set DATABASE_URL and DATABASE_AUTH_TOKEN yourself.",
  );
} else if (url.startsWith("file:")) {
  problems.push(
    "DATABASE_URL points at a local file. Serverless filesystems are ephemeral, so every " +
      "deploy would start with an empty database. Use a libsql:// URL from Turso.",
  );
} else if (!token) {
  problems.push("The database URL is set but its auth token is not (DATABASE_AUTH_TOKEN or TURSO_AUTH_TOKEN).");
}

if (secret.length < 32) {
  problems.push(
    "AUTH_SECRET is missing or shorter than 32 characters. It signs session cookies. " +
      "Generate one with: openssl rand -base64 48",
  );
}

if (problems.length > 0) {
  console.error("\ncheck-env: this deployment is not configured.\n");
  for (const problem of problems) console.error(`  • ${problem}\n`);
  process.exit(1);
}

console.log("check-env: database and AUTH_SECRET are configured.");
