"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

import { ATTRIBUTES, ATTRIBUTE_KEYS, type AttributeKey } from "@/lib/game";
import { AttributeGlyph, Fleuron, Icon } from "./glyphs";
import { useGame } from "./GameProvider";
import { QuestCard } from "./QuestCard";
import { QuestComposer } from "./QuestComposer";
import { EmptyState } from "./ui";

type Filter = AttributeKey | "all";

function formatToday(dayKey: string): string {
  // Parsed as UTC so the label matches the day key exactly, with no
  // off-by-one from the browser's own offset.
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function QuestLog() {
  const { snapshot } = useGame();
  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(true);

  const { open, done } = useMemo(() => {
    const visible =
      filter === "all"
        ? snapshot.quests
        : snapshot.quests.filter((q) => q.attribute === filter);
    return {
      open: visible.filter((q) => !q.isComplete),
      done: visible.filter((q) => q.isComplete),
    };
  }, [filter, snapshot.quests]);

  const hasAnyQuests = snapshot.quests.length > 0;
  const allDone = hasAnyQuests && open.length === 0 && done.length > 0;

  return (
    <section aria-labelledby="log-heading" className="space-y-4">
      {/* ── heading ── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            id="log-heading"
            className="font-display text-2xl tracking-wide text-parchment sm:text-[1.75rem]"
          >
            Quest Log
          </h1>
          <p className="scribe text-sm">{formatToday(snapshot.today)}</p>
        </div>

        <p className="text-right text-[0.78rem] text-parchment-faint">
          <span className="numeral text-parchment-dim">{open.length}</span>{" "}
          open ·{" "}
          <span className="numeral text-gold">{done.length}</span> sealed
        </p>
      </header>

      {/* ── attribute filter ── */}
      <div
        role="group"
        aria-label="Filter quests by attribute"
        className="flex flex-wrap gap-1.5"
      >
        <button
          type="button"
          data-active={filter === "all"}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
          className="rule-btn !px-3 !py-1.5 !text-[0.65rem]"
        >
          All
        </button>
        {ATTRIBUTE_KEYS.map((key) => {
          const count = snapshot.quests.filter(
            (q) => q.attribute === key && !q.isComplete,
          ).length;
          return (
            <button
              key={key}
              type="button"
              data-tone={key}
              data-active={filter === key}
              aria-pressed={filter === key}
              onClick={() => setFilter(filter === key ? "all" : key)}
              className="rule-btn !px-3 !py-1.5 !text-[0.65rem]"
              style={
                filter === key
                  ? {
                      color: "var(--tone)",
                      borderColor: "color-mix(in oklab, var(--tone) 55%, transparent)",
                      backgroundColor: "color-mix(in oklab, var(--tone) 12%, transparent)",
                    }
                  : undefined
              }
            >
              <AttributeGlyph attribute={key} className="size-3.5" />
              {ATTRIBUTES[key].name}
              {count > 0 ? (
                <span className="numeral ml-0.5 opacity-60">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <QuestComposer />

      {/* ── open quests ── */}
      {!hasAnyQuests ? (
        <EmptyState title="The page is blank">
          Nothing is written here yet. Inscribe your first quest above — start
          with something you would have done anyway, so the first seal is easy.
        </EmptyState>
      ) : open.length === 0 && filter !== "all" ? (
        <EmptyState title="Nothing open here">
          No {ATTRIBUTES[filter as AttributeKey].name.toLowerCase()} quests are
          waiting. Try another attribute, or write a new one.
        </EmptyState>
      ) : allDone ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="plate plate--ruled plate--cornered px-6 py-10 text-center"
        >
          <Icon.Check className="mx-auto size-8 text-gold" />
          <h2 className="mt-3 font-display text-xl text-parchment">
            The day is sealed
          </h2>
          <Fleuron className="mx-auto my-3 h-3 w-28 text-ink-400" />
          <p className="scribe mx-auto max-w-sm text-sm">
            Every quest in the log is done. The page rewrites itself at midnight
            in your own timezone — rest until then.
          </p>
        </motion.div>
      ) : (
        <ul className="space-y-2.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {open.map((quest, i) => (
              <QuestCard key={quest.id} quest={quest} index={i} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* ── sealed today ── */}
      {done.length > 0 ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            aria-expanded={showDone}
            aria-controls="sealed-list"
            className="group mb-2.5 flex w-full items-center gap-2.5"
          >
            <span className="eyebrow transition-colors group-hover:text-gold">
              Sealed today
            </span>
            <span className="numeral text-[0.7rem] text-gold">{done.length}</span>
            <span className="h-px flex-1 bg-gradient-to-r from-ink-500 to-transparent" />
            <Icon.Chevron
              className={`size-4 text-parchment-faint transition-transform duration-200 ${
                showDone ? "" : "-rotate-90"
              }`}
            />
          </button>

          <AnimatePresence initial={false}>
            {showDone ? (
              <motion.ul
                id="sealed-list"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2.5 overflow-hidden"
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  {done.map((quest, i) => (
                    <QuestCard key={quest.id} quest={quest} index={i} />
                  ))}
                </AnimatePresence>
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </section>
  );
}
