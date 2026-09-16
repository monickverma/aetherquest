"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { ascensionLine, ATTRIBUTES } from "@/lib/game";
import { AttributeGlyph, Fleuron } from "./glyphs";
import { useGame } from "./GameProvider";

/**
 * The ascension rite.
 *
 * This is the one moment the interface is allowed to stop everything and be
 * theatrical, so it is worth the code: a bloom of light, a wax medallion that
 * stamps down onto the page, and embers lifting off it. Under a reduced-motion
 * preference the same information arrives, it just arrives still.
 */

const EMBER_COUNT = 18;

function Embers({ tone }: { tone: string }) {
  // Deterministic scatter: seeded from the index so it does not reshuffle
  // between renders and cause flicker.
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: EMBER_COUNT }, (_, i) => {
        const angle = (i / EMBER_COUNT) * Math.PI * 2 + (i % 3) * 0.4;
        const spread = 60 + ((i * 37) % 90);
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 block rounded-full"
            style={{
              width: `${3 + (i % 3)}px`,
              height: `${3 + (i % 3)}px`,
              background: tone,
              boxShadow: `0 0 8px 1px ${tone}`,
              ["--dx" as string]: `${Math.cos(angle) * spread}px`,
              ["--dy" as string]: `${Math.sin(angle) * spread - 110}px`,
              ["--s" as string]: `${0.3 + (i % 4) * 0.2}`,
              animation: `ember-rise ${1400 + (i % 5) * 260}ms var(--ease-ink) ${
                120 + i * 45
              }ms both`,
            }}
          />
        );
      })}
    </div>
  );
}

export function LevelUpRite() {
  const { rite, dismissRite } = useGame();
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape closes, and focus moves to the only control so the overlay is
  // immediately dismissible from the keyboard.
  useEffect(() => {
    if (!rite) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissRite();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rite, dismissRite]);

  const isLevel = rite?.kind === "level";
  const tone = isLevel
    ? "var(--color-gold)"
    : rite
      ? `var(--color-${ATTRIBUTES[rite.attribute].tone})`
      : "var(--color-gold)";

  return (
    <AnimatePresence>
      {rite ? (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="rite-title"
          aria-describedby="rite-body"
        >
          {/* Scrim — clicking anywhere dismisses. */}
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-ink-950/88 backdrop-blur-sm"
            onClick={dismissRite}
            tabIndex={-1}
            aria-hidden="true"
          />

          <motion.div
            className="plate plate--ruled plate--cornered relative w-full max-w-md overflow-visible px-8 py-10 text-center"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {/* The medallion, with its bloom and embers. */}
            <div className="relative mx-auto mb-6 grid size-32 place-items-center">
              {!reduce && (
                <>
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${tone}55, transparent 62%)`,
                      animation: "halo-bloom 1500ms var(--ease-ink) both",
                    }}
                  />
                  <Embers tone={tone} />
                </>
              )}

              <div
                className="relative grid size-28 place-items-center rounded-full border"
                style={{
                  borderColor: tone,
                  background: `radial-gradient(120% 130% at 32% 18%, ${tone}33, transparent 58%), linear-gradient(170deg, var(--color-ink-700), var(--color-ink-900))`,
                  boxShadow: `0 0 34px -6px ${tone}, inset 0 1px 0 ${tone}44`,
                  animation: reduce
                    ? undefined
                    : "seal-stamp 620ms var(--ease-seal) both",
                }}
              >
                {isLevel ? (
                  <span
                    className="numeral font-display text-5xl leading-none"
                    style={{ color: tone }}
                  >
                    {rite.level}
                  </span>
                ) : (
                  <AttributeGlyph
                    attribute={rite.attribute}
                    className="size-12"
                    style={{ color: tone }}
                  />
                )}
              </div>
            </div>

            <p className="eyebrow mb-2" style={{ color: tone }}>
              {isLevel ? "Ascension" : "The rank rises"}
            </p>

            <h2
              id="rite-title"
              className="font-display text-3xl tracking-wide text-parchment"
            >
              {isLevel ? `Level ${rite.level}` : `${rite.name} ${rite.rank}`}
            </h2>

            <Fleuron className="mx-auto my-4 h-3 w-28 text-ink-400" />

            <p id="rite-body" className="scribe text-[0.95rem]">
              {isLevel
                ? ascensionLine(rite.level)
                : `Your ${rite.name.toLowerCase()} deepens. ${
                    ATTRIBUTES[rite.attribute].blurb
                  }.`}
            </p>

            <button
              ref={closeRef}
              type="button"
              onClick={dismissRite}
              className="seal-btn seal-btn--gold mt-7 w-full"
            >
              Return to the log
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
