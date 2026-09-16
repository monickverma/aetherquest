"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useGame } from "./GameProvider";

const EMBERS = 12;

/**
 * The payout burst: a ring of gold embers thrown off the seal that was pressed,
 * and the reward lifting away from it. Drawn in a fixed layer above the page,
 * so it plays out in full even while the quest card animates into the sealed
 * list beneath it.
 *
 * The figures are also announced politely for screen readers, because the
 * visual burst on its own would say nothing to them.
 */
export function SparkLayer() {
  const { sparks } = useGame();
  const reduce = useReducedMotion();
  const latest = sparks[sparks.length - 1];

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-[115]" aria-hidden="true">
        <AnimatePresence>
          {sparks.map((spark) => (
            <motion.div
              key={spark.id}
              className="absolute"
              style={{ left: spark.x, top: spark.y }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {!reduce &&
                Array.from({ length: EMBERS }, (_, i) => {
                  const angle = (i / EMBERS) * Math.PI * 2;
                  const distance = 26 + ((i * 13) % 22);
                  return (
                    <span
                      key={i}
                      className="absolute block rounded-full"
                      style={{
                        width: i % 3 === 0 ? 4 : 3,
                        height: i % 3 === 0 ? 4 : 3,
                        marginLeft: -2,
                        marginTop: -2,
                        background: i % 4 === 0 ? "#fff3cf" : "var(--color-gold-bright)",
                        boxShadow: "0 0 8px 1px rgba(236, 203, 105, 0.85)",
                        ["--dx" as string]: `${Math.cos(angle) * distance}px`,
                        ["--dy" as string]: `${Math.sin(angle) * distance - 18}px`,
                        ["--s" as string]: "0.2",
                        animation: `ember-rise ${620 + (i % 4) * 90}ms var(--ease-ink) both`,
                      }}
                    />
                  );
                })}

              <motion.div
                className="absolute flex -translate-x-1/2 flex-col items-center whitespace-nowrap"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.7 }}
                animate={
                  reduce
                    ? { opacity: [0, 1, 1, 0] }
                    : { opacity: [0, 1, 1, 0], y: -64, scale: 1 }
                }
                transition={{ duration: 1.5, times: [0, 0.12, 0.7, 1], ease: [0.2, 0.7, 0.2, 1] }}
                style={{ top: -22 }}
              >
                <span className="numeral font-display text-xl font-bold text-gold-bright drop-shadow-[0_0_12px_rgba(201,162,39,0.9)]">
                  +{spark.xp} XP
                </span>
                <span className="numeral font-display text-xs tracking-wider text-gold drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]">
                  +{spark.gold} gold
                </span>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="sr-only" aria-live="polite">
        {latest ? `Sealed. Earned ${latest.xp} experience and ${latest.gold} gold.` : ""}
      </p>
    </>
  );
}
