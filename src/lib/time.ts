/**
 * Day-key helpers.
 *
 * A "day key" is a calendar label in the form YYYY-MM-DD, resolved in a
 * specific IANA timezone. Streaks are counted in day keys rather than in
 * elapsed hours, so a streak rolls over at the adventurer's own midnight
 * and a completion at 23:58 followed by one at 00:02 counts as two days.
 */

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Returns true for a syntactically valid IANA timezone that this runtime knows. */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Falls back to UTC for anything this runtime cannot resolve. */
export function safeTimeZone(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? tz : "UTC";
}

/** The YYYY-MM-DD calendar day `date` falls on, as seen from `timeZone`. */
export function dayKey(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape we want.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's day key in the given timezone. */
export function todayKey(timeZone: string): string {
  return dayKey(new Date(), timeZone);
}

export function isDayKey(value: unknown): value is string {
  return typeof value === "string" && DAY_KEY_RE.test(value);
}

/**
 * Day keys are calendar labels, not instants, so we do the arithmetic in UTC.
 * That avoids DST shifts silently adding or removing a day.
 */
function keyToUtcDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcDateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysToKey(key: string, days: number): string {
  const date = keyToUtcDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateToKey(date);
}

export function previousDayKey(key: string): string {
  return addDaysToKey(key, -1);
}

/** Whole calendar days between two day keys (`later` - `earlier`). */
export function daysBetweenKeys(earlier: string, later: string): number {
  const ms = keyToUtcDate(later).getTime() - keyToUtcDate(earlier).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * A stored streak is only still "alive" if the last active day was today or
 * yesterday. Anything older has silently lapsed, so it must read as 0 even
 * though the stored value has not been rewritten yet.
 */
export function liveStreak(
  storedStreak: number,
  lastActiveOn: string | null,
  timeZone: string,
): number {
  if (!storedStreak || !isDayKey(lastActiveOn)) return 0;
  const gap = daysBetweenKeys(lastActiveOn, todayKey(timeZone));
  return gap <= 1 && gap >= 0 ? storedStreak : 0;
}

/** Descending list of the last `count` day keys, ending today. */
export function recentDayKeys(timeZone: string, count: number): string[] {
  const today = todayKey(timeZone);
  return Array.from({ length: count }, (_, i) => addDaysToKey(today, -i));
}
