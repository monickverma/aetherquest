"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { computeAward, levelState, xpForLevel } from "@/lib/game";
import { AttributeGlyph, Icon, SigilGlyph } from "../glyphs";

/**
 * A looping, non-interactive illustration of the core loop: two quests are
 * sealed in turn, the second one tips the character over into a new level.
 *
 * The figures are computed with the real engine, so the demo cannot drift from
 * what the app actually pays. It pauses whenever it is scrolled out of view or
 * the tab is hidden, and holds still under a reduced-motion preference.
 */

const STREAK = 7;
const START_XP = xpForLevel(4) + 312;

const QUESTS = [
  {
    title: "Read twenty pages",
    attribute: "intellect" as const,
    difficulty: "standard" as const,
    tag: "III · Standard · Intellect",
  },
  {
    title: "Run three miles before breakfast",
    attribute: "might" as const,
    difficulty: "hard" as const,
    tag: "IV · Hard · Might",
  },
];

const AWARDS = QUESTS.map((q) => computeAward(q.difficulty, STREAK));

const TIMELINE = [2000, 2000, 3400]; // ms spent on step 0, 1, 2

export function SealDemo() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // `useReducedMotion` resolves after hydration; settle on a still frame that
  // shows one quest sealed, which tells the story without any movement.
  useEffect(() => {
    if (reduce) setStep(1);
  }, [reduce]);

  useEffect(() => {
    if (reduce || !visible) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === "hidden") return;
      setStep((s) => (s + 1) % 3);
    }, TIMELINE[step]);
    return () => window.clearTimeout(timer);
  }, [step, reduce, visible]);

  const earnedXp = AWARDS.slice(0, step).reduce((sum, a) => sum + a.xp, 0);
  const earnedGold = AWARDS.slice(0, step).reduce((sum, a) => sum + a.gold, 0);
  const level = levelState(START_XP + earnedXp);
  const leveledUp = step === 2;

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label="Illustration: a character at level 4 seals two daily quests, earning experience and gold, and rises to level 5."
      className="relative"
    >
      <div aria-hidden="true" className="space-y-3">
        {/* ── the mini character sheet ── */}
        <div className="plate plate--ruled relative overflow-hidden p-5">
          <div className="flex items-center gap-3.5">
            <div
              className="relative grid size-14 shrink-0 place-items-center rounded-full border border-gold/45"
              style={{
                background:
                  "radial-gradient(120% 130% at 32% 18%, rgba(201,162,39,0.22), transparent 58%), var(--color-ink-900)",
              }}
            >
              <SigilGlyph name="quill" className="size-7 text-gold" />
              <motion.span
                key={level.level}
                initial={{ scale: leveledUp ? 1.9 : 1, rotate: leveledUp ? -18 : 0 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 14 }}
                className="numeral absolute -bottom-1 -right-1.5 grid min-w-7 place-items-center rounded-full border border-gold/60 px-1 py-0.5 font-display text-[0.65rem] font-bold leading-none text-ink-950"
                style={{
                  background:
                    "linear-gradient(170deg, var(--color-gold-bright), var(--color-gold-deep))",
                }}
              >
                {level.level}
              </motion.span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base text-parchment">
                Wren of the Long Road
              </p>
              <p className="gilt font-display text-[0.65rem] tracking-[0.22em] uppercase">
                Inkbound
              </p>
            </div>

            <div className="text-right">
              <p className="numeral flex items-center justify-end gap-1 font-display text-sm text-gold">
                <Icon.Coin className="size-3.5" />
                {(1204 + earnedGold).toLocaleString("en-US")}
              </p>
              <p className="numeral flex items-center justify-end gap-1 text-[0.7rem] text-parchment-dim">
                <Icon.Flame className="size-3.5 text-seal-bright" />
                {STREAK} days
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="eyebrow !text-[0.6rem]">
              Level <span className="numeral text-gold">{level.level}</span>
            </span>
            <span className="numeral text-[0.68rem] text-parchment-faint">
              {level.xpIntoLevel} / {level.xpForNextLevel} XP
            </span>
          </div>
          <div className="vein mt-1.5 h-2">
            <div
              className="vein__fill"
              style={{ width: `${Math.max(3, level.progress * 100)}%` }}
            />
          </div>

          {/* the ascension flash */}
          <AnimatePresence>
            {leveledUp && !reduce ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.4, times: [0, 0.12, 0.7, 1] }}
                className="absolute inset-0 grid place-items-center"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(201,162,39,0.34), rgba(10,8,7,0.9) 72%)",
                }}
              >
                <div className="text-center">
                  <p className="eyebrow !text-[0.6rem] text-gold">Ascension</p>
                  <p className="font-display text-3xl text-parchment">
                    Level {level.level}
                  </p>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ── the two quests ── */}
        {QUESTS.map((quest, index) => {
          const sealed = step > index;
          const award = AWARDS[index];
          return (
            <div
              key={quest.title}
              data-tone={quest.attribute}
              className={`plate relative flex items-center gap-3 p-3.5 pl-4 transition-opacity duration-500 ${
                sealed ? "opacity-70" : ""
              }`}
            >
              <span
                className="absolute inset-y-0 left-0 w-[3px] rounded-l-[3px] transition-colors duration-500"
                style={{
                  background: sealed ? "var(--color-ink-400)" : "var(--tone)",
                  boxShadow: sealed ? undefined : "0 0 12px -3px var(--tone)",
                }}
              />
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full border transition-colors duration-500"
                style={{
                  borderColor: sealed
                    ? "var(--color-ink-500)"
                    : "color-mix(in oklab, var(--tone) 45%, transparent)",
                }}
              >
                <AttributeGlyph
                  attribute={quest.attribute}
                  className={`size-4.5 transition-colors duration-500 ${
                    sealed ? "text-ink-400" : "text-[var(--tone)]"
                  }`}
                />
              </span>

              <div className="min-w-0 flex-1">
                <p
                  key={`${quest.title}-${sealed}`}
                  className={`truncate font-display text-[0.9rem] text-parchment ${
                    sealed ? "struck" : ""
                  }`}
                >
                  {quest.title}
                </p>
                <p className="text-[0.65rem] text-parchment-faint">
                  {quest.tag}
                  {!sealed ? (
                    <span className="text-gold">
                      {" "}
                      · +{award.xp} XP, +{award.gold} gold
                    </span>
                  ) : null}
                </p>
              </div>

              <span
                className={`seal-btn !px-3 !py-1.5 !text-[0.6rem] ${
                  sealed ? "!opacity-0" : ""
                } transition-opacity duration-300`}
                style={{
                  transform: step === index + 1 ? "scale(0.94)" : undefined,
                }}
              >
                <Icon.Check className="size-3.5" />
                Seal
              </span>

              <AnimatePresence>
                {step === index + 1 && !reduce ? (
                  <motion.span
                    initial={{ opacity: 0, y: 4, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -38, scale: 1 }}
                    transition={{ duration: 1.5, times: [0, 0.15, 0.6, 1] }}
                    className="numeral pointer-events-none absolute right-5 top-2 font-display text-base font-bold text-gold-bright drop-shadow-[0_0_10px_rgba(201,162,39,0.8)]"
                  >
                    +{award.xp} XP
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
