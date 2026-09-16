import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/* ────────────────────────────────────────────────────────────
   Conventions
   - ids are uuid v4 strings generated in app code
   - timestamps are unix epoch seconds (integer)
   - "day keys" are YYYY-MM-DD strings resolved in the adventurer's
     own timezone, so streaks roll over at their midnight rather
     than the server's.
   ──────────────────────────────────────────────────────────── */

const now = sql`(unixepoch())`;

/* ── users ─────────────────────────────────────────────────── */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

/* ── characters ────────────────────────────────────────────────
   One per user. Holds the progression state the client is never
   trusted to compute. `level` is deliberately NOT stored: it is
   derived from `xp`, so the two can never drift apart.
   ──────────────────────────────────────────────────────────── */

export const characters = sqliteTable(
  "characters",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    xp: integer("xp").notNull().default(0),
    gold: integer("gold").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    /** Day key of the most recent completion, in the adventurer's timezone. */
    lastActiveOn: text("last_active_on"),
    /** Slug of the equipped title item, e.g. "title-nightwarden". */
    equippedTitle: text("equipped_title"),
    /** Slug of the equipped sigil item, rendered as the avatar crest. */
    equippedSigil: text("equipped_sigil"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("characters_user_unique").on(t.userId)],
);

/* ── attributes ────────────────────────────────────────────────
   Five rows per character. Each quest trains exactly one.
   ──────────────────────────────────────────────────────────── */

export const attributes = sqliteTable(
  "attributes",
  {
    id: text("id").primaryKey(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    /** One of ATTRIBUTE_KEYS: might | intellect | discipline | vitality | spirit */
    key: text("key").notNull(),
    xp: integer("xp").notNull().default(0),
  },
  (t) => [
    uniqueIndex("attributes_character_key_unique").on(t.characterId, t.key),
  ],
);

/* ── quests ────────────────────────────────────────────────── */

export const quests = sqliteTable(
  "quests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    /** Which attribute this quest trains. */
    attribute: text("attribute").notNull(),
    /** trivial | easy | standard | hard | epic — decides XP and gold. */
    difficulty: text("difficulty").notNull().default("standard"),
    /** once | daily */
    cadence: text("cadence").notNull().default("daily"),
    /** active | archived */
    status: text("status").notNull().default("active"),
    /** For `once` quests: epoch seconds of completion, else null. */
    completedAt: integer("completed_at"),
    /** For `daily` quests: the last day key it was completed on. */
    lastCompletedOn: text("last_completed_on"),
    /** Manual ordering within the quest log. */
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [
    index("quests_user_status_idx").on(t.userId, t.status),
    index("quests_user_sort_idx").on(t.userId, t.sortOrder),
  ],
);

/* ── deeds (the completion ledger) ─────────────────────────────
   Append-only history. Title, attribute and difficulty are
   SNAPSHOTTED so the Codex stays readable after a quest has been
   renamed or deleted.
   ──────────────────────────────────────────────────────────── */

export const deeds = sqliteTable(
  "deeds",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questId: text("quest_id").references(() => quests.id, {
      onDelete: "set null",
    }),
    questTitle: text("quest_title").notNull(),
    attribute: text("attribute").notNull(),
    difficulty: text("difficulty").notNull(),
    xpAwarded: integer("xp_awarded").notNull(),
    goldAwarded: integer("gold_awarded").notNull(),
    /** Streak multiplier applied, stored x100 (125 means 1.25x). */
    streakBonusPct: integer("streak_bonus_pct").notNull().default(100),
    /** Day key in the adventurer's timezone. */
    completedOn: text("completed_on").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [
    index("deeds_user_created_idx").on(t.userId, t.createdAt),
    index("deeds_user_day_idx").on(t.userId, t.completedOn),
  ],
);

/* ── items (shop catalogue, seeded) ────────────────────────── */

export const items = sqliteTable("items", {
  /** Human-readable slug, e.g. "title-nightwarden". */
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  /** title | sigil | relic */
  kind: text("kind").notNull(),
  /** common | rare | epic | legendary */
  rarity: text("rarity").notNull().default("common"),
  price: integer("price").notNull(),
  requiredLevel: integer("required_level").notNull().default(1),
  /** Kind-specific payload: the glyph for a sigil, the emblem for a relic. */
  glyph: text("glyph"),
  sortOrder: integer("sort_order").notNull().default(0),
});

/* ── inventory ─────────────────────────────────────────────── */

export const inventory = sqliteTable(
  "inventory",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    pricePaid: integer("price_paid").notNull(),
    acquiredAt: integer("acquired_at").notNull().default(now),
  },
  (t) => [uniqueIndex("inventory_user_item_unique").on(t.userId, t.itemId)],
);

/* ── rate limits ───────────────────────────────────────────────
   Fixed-window counters for the auth endpoints. They live in the
   database rather than in memory because a serverless deployment
   runs many short-lived instances, and a per-process counter is
   never shared between them. The key is a hash, never a raw IP.
   ──────────────────────────────────────────────────────────── */

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    /** Epoch milliseconds at which the current window closes. */
    resetAt: integer("reset_at").notNull(),
  },
  (t) => [index("rate_limits_reset_idx").on(t.resetAt)],
);

/* ── relations ─────────────────────────────────────────────── */

export const usersRelations = relations(users, ({ one, many }) => ({
  character: one(characters, {
    fields: [users.id],
    references: [characters.userId],
  }),
  quests: many(quests),
  deeds: many(deeds),
  inventory: many(inventory),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  user: one(users, { fields: [characters.userId], references: [users.id] }),
  attributes: many(attributes),
}));

export const attributesRelations = relations(attributes, ({ one }) => ({
  character: one(characters, {
    fields: [attributes.characterId],
    references: [characters.id],
  }),
}));

export const questsRelations = relations(quests, ({ one, many }) => ({
  user: one(users, { fields: [quests.userId], references: [users.id] }),
  deeds: many(deeds),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  user: one(users, { fields: [inventory.userId], references: [users.id] }),
  item: one(items, { fields: [inventory.itemId], references: [items.id] }),
}));

/* ── inferred types ────────────────────────────────────────── */

export type User = typeof users.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Attribute = typeof attributes.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type Deed = typeof deeds.$inferSelect;
export type Item = typeof items.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
