import Link from "next/link";

import { Fleuron, Wordmark } from "@/components/glyphs";

export default function NotFound() {
  return (
    <main
      id="main"
      className="grid min-h-dvh place-items-center px-5 py-16"
    >
      <div className="plate plate--ruled plate--cornered w-full max-w-md px-8 py-12 text-center">
        <p className="eyebrow mb-4">Error 404</p>
        <h1 className="font-display text-3xl text-parchment">
          This page was never written
        </h1>
        <Fleuron className="mx-auto my-5 h-3 w-28 text-ink-400" />
        <p className="scribe">
          Whatever you were looking for is not in this book. Perhaps it was torn
          out, or perhaps it was only ever a rumour.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/sanctum" className="seal-btn">
            Return to the Sanctum
          </Link>
          <Link href="/" className="rule-btn">
            <Wordmark className="text-[0.7rem]" />
          </Link>
        </div>
      </div>
    </main>
  );
}
