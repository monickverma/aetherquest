/**
 * The progression engine.
 *
 * Every number the adventurer can see is derived here, and every award is
 * computed on the server from the quest's own stored difficulty. The client
 * never sends an XP or gold amount — it only ever names a quest — so the
 * worst a tampered request can do is complete a quest the user already owns.
 *
 * These functions are pure and shared by both runtimes: the server uses them
 * to write state, the client uses the identical maths to render optimistic
 * updates that cannot disagree with what the server is about to return.
 */

/* ── attributes ────────────────────────────────────────────── */

export const ATTRIBUTE_KEYS = [
  "might",
  "intellect",
  "discipline",
  "vitality",
  "spirit",
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export type AttributeMeta = {
  key: AttributeKey;
  name: string;
  /** Shown under the stat name on the character sheet. */
  blurb: string;
  /** Examples surfaced in the quest composer to make the choice obvious. */
  examples: string;
  /** CSS custom-property suffix, resolved against the theme in globals.css. */
  tone: string;
};

export const ATTRIBUTES: Record<AttributeKey, AttributeMeta> = {
  might: {
    key: "might",
    name: "Might",
    blurb: "Iron earned through effort",
    examples: "training, lifting, running, hard labour",
    tone: "might",
  },
  intellect: {
    key: "intellect",
    name: "Intellect",
    blurb: "Knowledge wrested from pages",
    examples: "study, reading, coding, practice",
    tone: "intellect",
  },
  discipline: {
    key: "discipline",
    name: "Discipline",
    blurb: "Order imposed upon chaos",
    examples: "chores, early rising, deep work, budgeting",
    tone: "discipline",
  },
  vitality: {
    key: "vitality",
    name: "Vitality",
    blurb: "The body kept in repair",
    examples: "sleep, water, cooking, walking outdoors",
    tone: "vitality",
  },
  spirit: {
    key: "spirit",
    name: "Spirit",
    blurb: "The inner flame, tended",
    examples: "creating, journalling, friends, rest",
    tone: "spirit",
  },
};

export function isAttributeKey(value: unknown): value is AttributeKey {
  return (
    typeof value === "string" &&
    (ATTRIBUTE_KEYS as readonly string[]).includes(value)
  );
}

/* ── difficulty ────────────────────────────────────────────── */

export const DIFFICULTY_KEYS = [
  "trivial",
  "easy",
  "standard",
  "hard",
  "epic",
] as const;

export type DifficultyKey = (typeof DIFFICULTY_KEYS)[number];

export type DifficultyMeta = {
  key: DifficultyKey;
  name: string;
  /** Roman numeral shown on the quest card as a rank pip. */
  numeral: string;
  xp: number;
  gold: number;
};

export const DIFFICULTIES: Record<DifficultyKey, DifficultyMeta> = {
  trivial: { key: "trivial", name: "Trivial", numeral: "I", xp: 10, gold: 4 },
  easy: { key: "easy", name: "Easy", numeral: "II", xp: 25, gold: 10 },
  standard: {
    key: "standard",
    name: "Standard",
    numeral: "III",
    xp: 50,
    gold: 22,
  },
  hard: { key: "hard", name: "Hard", numeral: "IV", xp: 100, gold: 50 },
  epic: { key: "epic", name: "Epic", numeral: "V", xp: 200, gold: 110 },
};

export function isDifficultyKey(value: unknown): value is DifficultyKey {
  return (
    typeof value === "string" &&
    (DIFFICULTY_KEYS as readonly string[]).includes(value)
  );
}

export const CADENCES = ["daily", "once"] as const;
export type Cadence = (typeof CADENCES)[number];

export function isCadence(value: unknown): value is Cadence {
  return typeof value === "string" && (CADENCES as readonly string[]).includes(value);
}

/* ── the level curve ───────────────────────────────────────────
   Non-linear by construction: the cost of advancing grows with
   level^1.35, so level 10 costs roughly 14x what level 1 did.

     L1  ->  2 :   100 xp
     L2  ->  3 :   193 xp
     L5  ->  6 :   567 xp
     L10 -> 11 : 1,383 xp
     L20 -> 21 : 3,464 xp
   ──────────────────────────────────────────────────────────── */

export const MAX_LEVEL = 60;

export function xpToAdvance(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.round(60 * Math.pow(level, 1.35)) + 40;
}

/** Cumulative XP required to first reach `level`. */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToAdvance(l);
  return total;
}

export type LevelState = {
  level: number;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP the current level costs in total. */
  xpForNextLevel: number;
  /** 0..1, for the progress bar. */
  progress: number;
  isMaxLevel: boolean;
  totalXp: number;
};

export function levelState(totalXp: number): LevelState {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  let remaining = xp;

  while (level < MAX_LEVEL) {
    const cost = xpToAdvance(level);
    if (remaining < cost) break;
    remaining -= cost;
    level++;
  }

  const isMaxLevel = level >= MAX_LEVEL;
  const xpForNextLevel = isMaxLevel ? 0 : xpToAdvance(level);

  return {
    level,
    xpIntoLevel: isMaxLevel ? 0 : remaining,
    xpForNextLevel,
    progress: isMaxLevel ? 1 : Math.min(1, remaining / xpForNextLevel),
    isMaxLevel,
    totalXp: xp,
  };
}

export function levelFromXp(totalXp: number): number {
  return levelState(totalXp).level;
}

/* ── attribute ranks ───────────────────────────────────────────
   A gentler curve, since attribute XP is only the slice of total
   XP that happened to train that one stat.
   ──────────────────────────────────────────────────────────── */

export const MAX_RANK = 30;

export function xpToAdvanceRank(rank: number): number {
  if (rank >= MAX_RANK) return Infinity;
  return Math.round(40 * Math.pow(rank, 1.3)) + 30;
}

export type RankState = {
  rank: number;
  xpIntoRank: number;
  xpForNextRank: number;
  progress: number;
  isMaxRank: boolean;
  title: string;
  totalXp: number;
};

const RANK_TITLES: ReadonlyArray<[minRank: number, title: string]> = [
  [25, "Mythic"],
  [20, "Grandmaster"],
  [16, "Master"],
  [12, "Adept"],
  [8, "Journeyman"],
  [4, "Apprentice"],
  [1, "Novice"],
];

export function rankTitle(rank: number): string {
  return RANK_TITLES.find(([min]) => rank >= min)?.[1] ?? "Novice";
}

export function rankState(totalXp: number): RankState {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  let rank = 1;
  let remaining = xp;

  while (rank < MAX_RANK) {
    const cost = xpToAdvanceRank(rank);
    if (remaining < cost) break;
    remaining -= cost;
    rank++;
  }

  const isMaxRank = rank >= MAX_RANK;
  const xpForNextRank = isMaxRank ? 0 : xpToAdvanceRank(rank);

  return {
    rank,
    xpIntoRank: isMaxRank ? 0 : remaining,
    xpForNextRank,
    progress: isMaxRank ? 1 : Math.min(1, remaining / xpForNextRank),
    isMaxRank,
    title: rankTitle(rank),
    totalXp: xp,
  };
}

/* ── streaks ───────────────────────────────────────────────── */

/** Days of streak beyond which the bonus stops growing. */
export const STREAK_BONUS_CAP_DAYS = 30;
/** Bonus added per consecutive day, as a fraction. */
export const STREAK_BONUS_PER_DAY = 0.02;

/** 1.00 .. 1.60 — a 30-day streak is worth 60% more XP and gold. */
export function streakMultiplier(streak: number): number {
  const days = Math.max(0, Math.min(streak, STREAK_BONUS_CAP_DAYS));
  return 1 + days * STREAK_BONUS_PER_DAY;
}

/** The same multiplier as an integer percentage, for storage. */
export function streakBonusPct(streak: number): number {
  return Math.round(streakMultiplier(streak) * 100);
}

/* ── awards ────────────────────────────────────────────────── */

export type Award = {
  xp: number;
  gold: number;
  baseXp: number;
  baseGold: number;
  streakBonusPct: number;
};

/**
 * The single source of truth for what a completion is worth.
 * `streak` is the streak the completion itself produces, so the very first
 * day of a streak already earns a small bonus.
 */
export function computeAward(difficulty: DifficultyKey, streak: number): Award {
  const base = DIFFICULTIES[difficulty] ?? DIFFICULTIES.standard;
  const multiplier = streakMultiplier(streak);
  return {
    xp: Math.round(base.xp * multiplier),
    gold: Math.round(base.gold * multiplier),
    baseXp: base.xp,
    baseGold: base.gold,
    streakBonusPct: streakBonusPct(streak),
  };
}

/* ── formatting ────────────────────────────────────────────── */

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

/** Level-up flavour, so the celebration is never the same two levels running. */
export function ascensionLine(level: number): string {
  const lines = [
    "The ink settles. A new page turns.",
    "The seal cracks. You are changed.",
    "Something in the dark takes notice.",
    "The margins fill with your name.",
    "Another rung, and the tower is taller than it looked.",
    "The candle gutters, then burns brighter.",
    "The quill moves without your hand.",
    "A door you had not noticed is now ajar.",
  ];
  return lines[level % lines.length];
}
