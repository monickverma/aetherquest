import type { Config } from "drizzle-kit";

// drizzle-kit only auto-loads `.env`; Next.js uses `.env.local`. Load it here
// so `npm run db:push` works with no extra flags in local development.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
    break;
  } catch {
    // Absent — fall through to the next candidate, then to real env vars.
  }
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      process.env.TURSO_DATABASE_URL ||
      "file:./data/aetherquest.db",
    authToken:
      process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined,
  },
} satisfies Config;
