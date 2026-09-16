import Link from "next/link";

import { ATTRIBUTES, ATTRIBUTE_KEYS } from "@/lib/game";
import { AttributeGlyph, Fleuron, Wordmark } from "./glyphs";

/**
 * The frontispiece around the sign-in and sign-up forms: on wide screens a
 * full-height illuminated plate beside the form, on narrow ones just the mark.
 */
export function AuthFrame({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ── the frontispiece ── */}
      <aside
        aria-hidden="true"
        className="relative hidden overflow-hidden border-r border-ink-600 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
        style={{
          background:
            "radial-gradient(80ch 60ch at 30% 38%, rgba(201,162,39,0.10), transparent 65%), linear-gradient(180deg, var(--color-ink-850), var(--color-ink-950))",
        }}
      >
        <Link href="/" tabIndex={-1} className="text-[0.95rem] text-parchment">
          <Wordmark />
        </Link>

        {/* The five attributes, set as a ring around a central seal. */}
        <div className="relative mx-auto my-10 aspect-square w-full max-w-[26rem]">
          <div className="absolute inset-[14%] rounded-full border border-ink-500" />
          <div className="absolute inset-[22%] rounded-full border border-dashed border-ink-500/70" />
          <div
            className="absolute inset-[34%] grid place-items-center rounded-full border border-gold/40"
            style={{
              background:
                "radial-gradient(120% 130% at 32% 18%, rgba(201,162,39,0.2), transparent 58%), var(--color-ink-900)",
              boxShadow: "0 0 60px -12px rgba(201,162,39,0.5)",
            }}
          >
            <span className="gilt font-display text-5xl">Æ</span>
          </div>

          {ATTRIBUTE_KEYS.map((key, i) => {
            const angle = (i / ATTRIBUTE_KEYS.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + Math.cos(angle) * 43;
            const y = 50 + Math.sin(angle) * 43;
            return (
              <div
                key={key}
                data-tone={key}
                className="ink-in absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  animationDelay: `${200 + i * 110}ms`,
                }}
              >
                <span
                  className="grid size-12 place-items-center rounded-full border bg-ink-900"
                  style={{
                    borderColor: "color-mix(in oklab, var(--tone) 50%, transparent)",
                    boxShadow: "0 0 24px -8px var(--tone)",
                  }}
                >
                  <AttributeGlyph attribute={key} className="size-5 text-[var(--tone)]" />
                </span>
                <span className="font-display text-[0.6rem] tracking-[0.24em] uppercase text-parchment-faint">
                  {ATTRIBUTES[key].name}
                </span>
              </div>
            );
          })}
        </div>

        <figure className="max-w-md">
          <blockquote className="scribe text-lg leading-relaxed text-parchment-dim">
            “The book does not remember what you meant to do. It remembers, with
            perfect fidelity, what you did.”
          </blockquote>
          <figcaption className="eyebrow mt-3">
            Inscribed on the first leaf of every Codex
          </figcaption>
        </figure>
      </aside>

      {/* ── the form ── */}
      <main id="main" className="flex flex-col px-5 py-8 sm:px-10 lg:justify-center lg:py-12">
        <Link href="/" className="mb-10 text-[0.9rem] text-parchment lg:hidden">
          <Wordmark />
          <span className="sr-only">AetherQuest home</span>
        </Link>

        <div className="ink-in mx-auto w-full max-w-sm">
          <p className="eyebrow mb-2 text-gold">{eyebrow}</p>
          <h1 className="font-display text-3xl leading-tight text-parchment">
            {title}
          </h1>
          <p className="scribe mt-2">{lede}</p>

          <Fleuron className="my-7 h-3 w-28 text-ink-400" />

          {children}
        </div>
      </main>
    </div>
  );
}
