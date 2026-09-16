import type { AttributeKey, Cadence, DifficultyKey } from "./game";

/**
 * The wire format between server and client.
 *
 * Everything here is already computed — levels, ranks, progress fractions,
 * award previews. The client renders these values and never recomputes them
 * from raw XP, which keeps the optimistic UI and the server in agreement.
 */

export type AttributeView = {
  key: AttributeKey;
  name: string;
  blurb: string;
  tone: string;
  xp: number;
  rank: number;
  title: string;
  xpIntoRank: number;
  xpForNextRank: number;
  progress: number;
  isMaxRank: boolean;
};

export type CharacterView = {
  name: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
  isMaxLevel: boolean;
  gold: number;
  streak: number;
  longestStreak: number;
  lastActiveOn: string | null;
  /** Resolved display name of the equipped title item, e.g. "Nightwarden". */
  title: string | null;
  /** Glyph id of the equipped sigil, resolved by the client to an SVG crest. */
  sigil: string | null;
};

export type QuestView = {
  id: string;
  title: string;
  notes: string | null;
  attribute: AttributeKey;
  difficulty: DifficultyKey;
  cadence: Cadence;
  status: "active" | "archived";
  sortOrder: number;
  createdAt: number;
  /** Already satisfied: today for a daily quest, ever for a one-off. */
  isComplete: boolean;
  lastCompletedOn: string | null;
  completedAt: number | null;
  /** What completing it right now would pay, at the current streak. */
  award: { xp: number; gold: number };
};

export type DeedView = {
  id: string;
  questTitle: string;
  attribute: AttributeKey;
  difficulty: DifficultyKey;
  xpAwarded: number;
  goldAwarded: number;
  streakBonusPct: number;
  completedOn: string;
  createdAt: number;
};

export type ItemView = {
  id: string;
  name: string;
  description: string;
  kind: "title" | "sigil" | "relic";
  rarity: "common" | "rare" | "epic" | "legendary";
  price: number;
  requiredLevel: number;
  glyph: string | null;
  owned: boolean;
  equipped: boolean;
  /** Why it cannot be bought right now, or null when it can. */
  lockedReason: string | null;
};

export type DayActivity = { day: string; deeds: number; xp: number };

export type CodexStats = {
  deeds: number;
  xp: number;
  gold: number;
  daysRecorded: number;
  bestDay: { day: string; deeds: number } | null;
  byAttribute: {
    key: AttributeKey;
    name: string;
    tone: string;
    deeds: number;
  }[];
};

export type Snapshot = {
  user: { id: string; email: string; displayName: string; timezone: string };
  character: CharacterView;
  attributes: AttributeView[];
  quests: QuestView[];
  today: string;
  activity: DayActivity[];
  totals: { deeds: number; xpToday: number; deedsToday: number };
};

/** Returned by a completion so the client can celebrate precisely. */
export type CompletionResult = {
  snapshot: Snapshot;
  award: { xp: number; gold: number; streakBonusPct: number };
  leveledUpTo: number | null;
  rankedUp: { attribute: AttributeKey; name: string; rank: number } | null;
  streakExtendedTo: number | null;
};

export type ApiFailure = { ok: false; error: string };
export type ApiSuccess<T> = { ok: true } & T;
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
