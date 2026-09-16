"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Fleuron, Icon } from "@/components/glyphs";

/**
 * Caught inside the signed-in shell, so navigation stays usable and the
 * adventurer can simply try again rather than being thrown to a blank page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sanctum] render error:", error);
  }, [error]);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <div
      role="alert"
      className="plate plate--ruled plate--cornered mx-auto mt-6 max-w-lg px-7 py-10 text-center"
    >
      <Icon.Warning className="mx-auto size-8 text-seal-bright" />
      <h1 className="mt-4 font-display text-2xl text-parchment">
        {offline ? "The lamps have gone out" : "A page has come loose"}
      </h1>
      <Fleuron className="mx-auto my-4 h-3 w-28 text-ink-400" />
      <p className="scribe text-[0.95rem]">
        {offline
          ? "You appear to be offline. Nothing you have earned is lost — it lives on the server. Reconnect and try again."
          : "Something failed while this page was being written. Your progress is stored safely; this is only a display problem."}
      </p>
      {error.digest ? (
        <p className="mt-3 text-[0.7rem] text-parchment-faint">
          Reference <code className="numeral">{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="seal-btn">
          Try again
        </button>
        <Link href="/sanctum" className="rule-btn">
          Back to the Sanctum
        </Link>
      </div>
    </div>
  );
}
