"use client";

import { motion } from "motion/react";
import { useState } from "react";

import { ApiError, api } from "@/lib/client";
import { ATTRIBUTES, DIFFICULTIES, formatNumber } from "@/lib/game";
import type { CodexStats, DeedView } from "@/lib/types";
import { AttributeGlyph, Fleuron, Icon } from "./glyphs";
import { useGame } from "./GameProvider";
import { EmptyState, Spinner, Vein } from "./ui";

function formatDay(dayKey: string, today: string): string {
  if (dayKey === today) return "Today";
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const [ty, tm, td] = today.split("-").map(Number);
  const yesterday = new Date(Date.UTC(ty, tm - 1, td));
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  if (date.getTime() === yesterday.getTime()) return "Yesterday";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: date.getUTCFullYear() === ty ? undefined : "numeric",
    timeZone: "UTC",
  }).format(date);
}

function groupByDay(deeds: DeedView[]) {
  const groups: { day: string; deeds: DeedView[] }[] = [];
  for (const deed of deeds) {
    const last = groups[groups.length - 1];
    if (last && last.day === deed.completedOn) last.deeds.push(deed);
    else groups.push({ day: deed.completedOn, deeds: [deed] });
  }
  return groups;
}

/* ── the summary plate ─────────────────────────────────────── */

function Summary({ stats }: { stats: CodexStats }) {
  const busiest = Math.max(1, ...stats.byAttribute.map((a) => a.deeds));

  return (
    <div className="plate plate--ruled plate--cornered p-5 sm:p-6">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        {[
          { label: "Deeds recorded", value: formatNumber(stats.deeds) },
          { label: "Experience earned", value: formatNumber(stats.xp) },
          { label: "Gold earned", value: formatNumber(stats.gold) },
          { label: "Days written", value: formatNumber(stats.daysRecorded) },
        ].map((stat) => (
          <div key={stat.label}>
            <dt className="eyebrow text-[0.6rem]">{stat.label}</dt>
            <dd className="numeral font-display text-2xl leading-tight text-gold">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      {stats.deeds > 0 ? (
        <>
          <Fleuron className="mx-auto my-5 h-3 w-32 text-ink-400" />

          <h2 className="eyebrow mb-3">Where the effort went</h2>
          <ul className="space-y-2.5">
            {stats.byAttribute.map((attribute) => (
              <li
                key={attribute.key}
                data-tone={attribute.tone}
                className="flex items-center gap-3"
              >
                <AttributeGlyph
                  attribute={attribute.key}
                  className="size-4 shrink-0 text-[var(--tone)]"
                />
                <span className="w-20 shrink-0 font-display text-[0.72rem] tracking-[0.1em] uppercase text-parchment-dim">
                  {attribute.name}
                </span>
                <Vein
                  value={attribute.deeds}
                  max={busiest}
                  tone
                  className="h-1.5 flex-1"
                  label={`${attribute.name}: ${attribute.deeds} deeds`}
                />
                <span className="numeral w-8 shrink-0 text-right text-[0.72rem] text-parchment-faint">
                  {attribute.deeds}
                </span>
              </li>
            ))}
          </ul>

          {stats.bestDay ? (
            <p className="mt-4 text-center text-[0.75rem] text-parchment-faint">
              Your busiest day was{" "}
              <span className="text-parchment-dim">{stats.bestDay.day}</span>{" "}
              with{" "}
              <span className="numeral text-gold">{stats.bestDay.deeds}</span>{" "}
              deeds.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ── the ledger ────────────────────────────────────────────── */

export function Codex({
  stats,
  initialDeeds,
  initialHasMore,
}: {
  stats: CodexStats;
  initialDeeds: DeedView[];
  initialHasMore: boolean;
}) {
  const { snapshot, notify } = useGame();
  const [deeds, setDeeds] = useState(initialDeeds);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);

  async function loadMore() {
    setBusy(true);
    try {
      const next = page + 1;
      const result = await api<{ deeds: DeedView[]; hasMore: boolean }>(
        `/api/codex?page=${next}`,
      );
      setDeeds((current) => [...current, ...result.deeds]);
      setHasMore(result.hasMore);
      setPage(next);
    } catch (error) {
      notify(
        error instanceof ApiError
          ? error.message
          : "Those pages could not be turned.",
        "seal",
      );
    } finally {
      setBusy(false);
    }
  }

  const groups = groupByDay(deeds);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-2xl tracking-wide text-parchment sm:text-[1.75rem]">
          Codex of Deeds
        </h1>
        <p className="scribe text-sm">
          Every quest you have ever sealed, in the order it happened.
        </p>
      </header>

      <Summary stats={stats} />

      {deeds.length === 0 ? (
        <EmptyState title="Nothing written yet">
          The Codex fills itself as you seal quests. Complete one in the Sanctum
          and it will appear here, permanently — even if you later delete the
          quest it came from.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.map((group, groupIndex) => (
            <section key={group.day} aria-labelledby={`day-${group.day}`}>
              <div className="mb-2.5 flex items-center gap-3">
                <h2
                  id={`day-${group.day}`}
                  className="font-display text-[0.78rem] tracking-[0.2em] uppercase text-gold"
                >
                  {formatDay(group.day, snapshot.today)}
                </h2>
                <span className="h-px flex-1 bg-gradient-to-r from-ink-500 to-transparent" />
                <span className="numeral text-[0.7rem] text-parchment-faint">
                  {group.deeds.length}{" "}
                  {group.deeds.length === 1 ? "deed" : "deeds"} ·{" "}
                  {formatNumber(
                    group.deeds.reduce((sum, d) => sum + d.xpAwarded, 0),
                  )}{" "}
                  XP
                </span>
              </div>

              <ul className="space-y-1.5">
                {group.deeds.map((deed, i) => (
                  <motion.li
                    key={deed.id}
                    data-tone={deed.attribute}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(0.3, (groupIndex * 4 + i) * 0.02),
                    }}
                    className="plate flex items-center gap-3 px-4 py-3"
                  >
                    <AttributeGlyph
                      attribute={deed.attribute}
                      className="size-4 shrink-0 text-[var(--tone)]"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.95rem] text-parchment">
                        {deed.questTitle}
                      </p>
                      <p className="text-[0.7rem] text-parchment-faint">
                        {ATTRIBUTES[deed.attribute].name} ·{" "}
                        {DIFFICULTIES[deed.difficulty].name}
                        {deed.streakBonusPct > 100 ? (
                          <>
                            {" "}
                            · streak{" "}
                            <span className="numeral text-seal-bright">
                              +{deed.streakBonusPct - 100}%
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    <p className="shrink-0 text-right">
                      <span className="numeral block font-display text-sm text-gold">
                        +{deed.xpAwarded} XP
                      </span>
                      <span className="numeral block text-[0.7rem] text-parchment-faint">
                        +{deed.goldAwarded} gold
                      </span>
                    </p>
                  </motion.li>
                ))}
              </ul>
            </section>
          ))}

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={busy}
                className="rule-btn"
              >
                {busy ? <Spinner className="size-4" /> : <Icon.Scroll className="size-4" />}
                Turn the page
              </button>
            </div>
          ) : (
            <p className="flex items-center justify-center gap-3 pt-2 text-[0.72rem] text-parchment-faint">
              <Fleuron className="h-3 w-20 text-ink-400" />
              The record begins here
              <Fleuron className="h-3 w-20 text-ink-400" />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
