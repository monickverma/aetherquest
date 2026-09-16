/**
 * Seeds the Vault catalogue.
 *
 * Idempotent: every row is upserted by slug, so running it again after editing
 * a price or a description updates the catalogue without touching anybody's
 * inventory. Safe to run against production.
 *
 *   npm run db:seed
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { items } from "../src/db/schema";

loadLocalEnv();

type SeedItem = typeof items.$inferInsert;

const CATALOGUE: SeedItem[] = [
  /* ── sigils: the crest worn beside your name ───────────── */
  {
    id: "sigil-ember",
    name: "Ember",
    description:
      "A single coal kept alive through a long night. Worn by those who started before they felt ready.",
    kind: "sigil",
    rarity: "common",
    price: 80,
    requiredLevel: 1,
    glyph: "ember",
    sortOrder: 10,
  },
  {
    id: "sigil-quill",
    name: "Quill",
    description:
      "Cut from a bird that never learned to sit still. For the ones who write the day down before living it.",
    kind: "sigil",
    rarity: "common",
    price: 150,
    requiredLevel: 2,
    glyph: "quill",
    sortOrder: 11,
  },
  {
    id: "sigil-anvil",
    name: "Anvil",
    description:
      "It does not move. That is the entire point of it.",
    kind: "sigil",
    rarity: "rare",
    price: 320,
    requiredLevel: 4,
    glyph: "anvil",
    sortOrder: 12,
  },
  {
    id: "sigil-moth",
    name: "Moth",
    description:
      "Drawn to the lamp, and unembarrassed about it. A crest for the deeply, usefully obsessed.",
    kind: "sigil",
    rarity: "rare",
    price: 320,
    requiredLevel: 4,
    glyph: "moth",
    sortOrder: 13,
  },
  {
    id: "sigil-hourglass",
    name: "Hourglass",
    description:
      "Turned over each morning without ceremony. Granted to those who kept a streak past the point of novelty.",
    kind: "sigil",
    rarity: "epic",
    price: 680,
    requiredLevel: 7,
    glyph: "hourglass",
    sortOrder: 14,
  },
  {
    id: "sigil-eclipse",
    name: "Eclipse",
    description:
      "Two bodies, briefly agreeing. Rare, and over quickly, and worth looking up for.",
    kind: "sigil",
    rarity: "legendary",
    price: 1400,
    requiredLevel: 12,
    glyph: "eclipse",
    sortOrder: 15,
  },
  {
    id: "sigil-ouroboros",
    name: "Ouroboros",
    description:
      "The serpent that makes a habit of itself. The oldest crest in the Vault, and the least explained.",
    kind: "sigil",
    rarity: "legendary",
    price: 2600,
    requiredLevel: 18,
    glyph: "ouroboros",
    sortOrder: 16,
  },

  /* ── titles: the line beneath your name ────────────────── */
  {
    id: "title-wayfarer",
    name: "Wayfarer",
    description:
      "You have gone further than the door. Modest, and earned, and the hardest one to get.",
    kind: "title",
    rarity: "common",
    price: 120,
    requiredLevel: 2,
    glyph: null,
    sortOrder: 20,
  },
  {
    id: "title-inkbound",
    name: "Inkbound",
    description:
      "Bound to the page by choice. For those whose Intellect outgrew their patience.",
    kind: "title",
    rarity: "rare",
    price: 420,
    requiredLevel: 5,
    glyph: null,
    sortOrder: 21,
  },
  {
    id: "title-nightwarden",
    name: "Nightwarden",
    description:
      "Someone has to keep the hours nobody wants. Tonight that is you.",
    kind: "title",
    rarity: "rare",
    price: 420,
    requiredLevel: 5,
    glyph: null,
    sortOrder: 22,
  },
  {
    id: "title-ironsworn",
    name: "Ironsworn",
    description:
      "An oath made to a heavy thing, and kept. Might does not arrive; it is collected.",
    kind: "title",
    rarity: "epic",
    price: 900,
    requiredLevel: 9,
    glyph: null,
    sortOrder: 23,
  },
  {
    id: "title-lamplighter",
    name: "Lamplighter",
    description:
      "Walks ahead of everyone else and leaves the street brighter. Often unthanked.",
    kind: "title",
    rarity: "epic",
    price: 900,
    requiredLevel: 9,
    glyph: null,
    sortOrder: 24,
  },
  {
    id: "title-archivist",
    name: "Archivist of Small Hours",
    description:
      "Keeper of the unglamorous record. Every trivial deed, written down and counted.",
    kind: "title",
    rarity: "legendary",
    price: 2200,
    requiredLevel: 15,
    glyph: null,
    sortOrder: 25,
  },
  {
    id: "title-unbroken",
    name: "The Unbroken",
    description:
      "The streak did not end. It simply kept not ending, which is a different and rarer thing.",
    kind: "title",
    rarity: "legendary",
    price: 2600,
    requiredLevel: 17,
    glyph: null,
    sortOrder: 26,
  },

  /* ── relics: trophies for the shelf ────────────────────── */
  {
    id: "relic-first-candle",
    name: "The First Candle",
    description:
      "Burnt to a stub on the night you decided to begin. Kept for sentimental reasons, which are the only reasons.",
    kind: "relic",
    rarity: "common",
    price: 60,
    requiredLevel: 1,
    glyph: "candle",
    sortOrder: 30,
  },
  {
    id: "relic-cracked-seal",
    name: "Cracked Wax Seal",
    description:
      "Broken open once and never resealed. Whatever was inside is now, irreversibly, your problem.",
    kind: "relic",
    rarity: "rare",
    price: 240,
    requiredLevel: 3,
    glyph: "seal",
    sortOrder: 31,
  },
  {
    id: "relic-bone-key",
    name: "Bone Key",
    description:
      "Fits a lock you have not found yet. The Vault is not forthcoming about which one.",
    kind: "relic",
    rarity: "epic",
    price: 520,
    requiredLevel: 6,
    glyph: "key",
    sortOrder: 32,
  },
  {
    id: "relic-starless-map",
    name: "The Starless Map",
    description:
      "Charts a country with no landmarks, drawn by someone who walked it anyway.",
    kind: "relic",
    rarity: "legendary",
    price: 1200,
    requiredLevel: 11,
    glyph: "map",
    sortOrder: 33,
  },
];

/** Loads .env.local when present, so `npm run db:seed` needs no extra flags. */
function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(file);
      return;
    } catch {
      // Not present — fall through to the next candidate, then to real env vars.
    }
  }
}

async function main() {
  const url =
    process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    "file:./data/aetherquest.db";
  const authToken =
    process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

  const db = drizzle(createClient({ url, authToken }));

  for (const item of CATALOGUE) {
    await db
      .insert(items)
      .values(item)
      .onConflictDoUpdate({
        target: items.id,
        set: {
          name: item.name,
          description: item.description,
          kind: item.kind,
          rarity: item.rarity!,
          price: item.price,
          requiredLevel: item.requiredLevel!,
          glyph: item.glyph ?? null,
          sortOrder: item.sortOrder!,
        },
      });
  }

  const counts = CATALOGUE.reduce<Record<string, number>>((acc, i) => {
    acc[i.kind] = (acc[i.kind] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    `Vault stocked against ${url.startsWith("file:") ? url : new URL(url).host}\n  ` +
      Object.entries(counts)
        .map(([kind, n]) => `${n} ${kind}${n === 1 ? "" : "s"}`)
        .join("\n  "),
  );
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
