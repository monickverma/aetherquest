"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Icon } from "./glyphs";
import { useGame } from "./GameProvider";

/**
 * Watches the browser's connection state.
 *
 * Offline: a banner explains that nothing will be lost and that sealing is
 * paused. Every mutation already refuses to send while offline and rolls its
 * optimistic change back, so the banner is explanation, not enforcement.
 *
 * Back online: the snapshot is re-fetched, because another device may have
 * changed things while this one was away.
 */
export function ConnectionBanner() {
  const { refresh, notify } = useGame();
  const [online, setOnline] = useState(true);
  const wasOffline = useRef(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOffline = () => {
      wasOffline.current = true;
      setOnline(false);
    };
    const goOnline = () => {
      setOnline(true);
      if (wasOffline.current) {
        wasOffline.current = false;
        refresh();
        notify("Reconnected. Your log has been brought up to date.", "gold");
      }
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [notify, refresh]);

  // Returning to a tab that has sat in the background for a while (or across
  // midnight) should never show stale quests as still sealed.
  useEffect(() => {
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > 60_000 && navigator.onLine) {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  return (
    <AnimatePresence>
      {!online ? (
        <motion.div
          role="status"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden border-b border-seal/60 bg-seal/20"
        >
          <p className="mx-auto flex max-w-[1280px] items-center gap-2.5 px-4 py-2.5 text-sm text-parchment sm:px-6">
            <Icon.Warning className="size-4 shrink-0 text-seal-bright" />
            <span>
              <strong className="font-display text-xs tracking-[0.14em] uppercase">
                The lamps are out.
              </strong>{" "}
              You are offline — sealing is paused, and nothing you have earned
              is lost.
            </span>
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
