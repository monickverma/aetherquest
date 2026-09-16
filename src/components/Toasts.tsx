"use client";

import { AnimatePresence, motion } from "motion/react";

import { Icon } from "./glyphs";
import { useGame } from "./GameProvider";

const TONE_STYLE: Record<string, string> = {
  gold: "border-gold/45 text-gold-bright",
  seal: "border-seal-bright/55 text-seal-bright",
  quiet: "border-ink-400 text-parchment-dim",
};

/**
 * Marginalia: notes that appear in the gutter of the page and fade.
 * The region is `aria-live="polite"`, so a screen reader hears every
 * message without focus ever being stolen.
 */
export function Toasts() {
  const { toasts, dismissToast } = useGame();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[110] flex flex-col items-center gap-2 px-4 pb-5 sm:items-end sm:px-6"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={`plate pointer-events-auto flex w-full max-w-sm items-start gap-3 border px-4 py-3 text-sm ${
              TONE_STYLE[toast.tone] ?? TONE_STYLE.quiet
            }`}
          >
            {toast.tone === "seal" ? (
              <Icon.Warning className="mt-0.5 size-4 shrink-0" />
            ) : (
              <Icon.Quill className="mt-0.5 size-4 shrink-0" />
            )}
            <p className="flex-1 leading-snug text-parchment">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="-m-1 rounded p-1 text-parchment-faint transition-colors hover:text-parchment"
            >
              <Icon.Close className="size-3.5" />
              <span className="sr-only">Dismiss this note</span>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
