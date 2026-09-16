import Link from "next/link";

import {
  AttributeGlyph,
  Fleuron,
  Icon,
  SigilGlyph,
  Wordmark,
} from "@/components/glyphs";
import { SealDemo } from "@/components/landing/SealDemo";
import {
  ATTRIBUTES,
  ATTRIBUTE_KEYS,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  STREAK_BONUS_CAP_DAYS,
  formatNumber,
  streakMultiplier,
  xpToAdvance,
} from "@/lib/game";
import { siteUrl } from "@/lib/env";

/**
 * The public front page. Deliberately fully static: no cookies are read, so it
 * is prerendered at build time and served from the edge. A signed-in visitor
 * who clicks "Sign in" is bounced straight to their Sanctum by the proxy.
 */

const LEVEL_ROWS = [1, 2, 3, 5, 10, 20, 40].map((level) => ({
  level,
  cost: xpToAdvance(level),
}));

const STREAK_ROWS = [1, 7, 14, 30].map((days) => ({
  days,
  bonus: Math.round((streakMultiplier(days) - 1) * 100),
}));

const LOOP = [
  {
    numeral: "I",
    title: "Inscribe",
    body: "Name a habit. Choose which of five attributes it trains and how hard it honestly is — harder quests pay more, so there is no reason to flatter yourself.",
  },
  {
    numeral: "II",
    title: "Seal",
    body: "Press the seal when it is done. Experience and gold land in the same instant, with no spinner and no waiting, and the deed is written into your Codex for good.",
  },
  {
    numeral: "III",
    title: "Ascend",
    body: "Every level costs more than the last. Every consecutive day adds to every reward. Miss a day and the flame goes out — the Codex, though, remembers everything.",
  },
];

const SPECIMENS = [
  { glyph: "ember", name: "Ember", rarity: "common", price: 80 },
  { glyph: "moth", name: "Moth", rarity: "rare", price: 320 },
  { glyph: "hourglass", name: "Hourglass", rarity: "epic", price: 680 },
  { glyph: "ouroboros", name: "Ouroboros", rarity: "legendary", price: 2600 },
] as const;

function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AetherQuest",
    url: siteUrl(),
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any (web browser)",
    description:
      "A dark-fantasy life RPG that turns daily habits into quests with experience points, levels, streaks, attributes and a shop of collectable rewards.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "Quest log for daily and one-off habits",
      "Non-linear level progression",
      "Five trainable attributes",
      "Daily streak with reward multiplier",
      "Gold economy and item shop",
      "Permanent history of completed deeds",
    ],
  };
  return (
    <script
      type="application/ld+json"
      // Static, build-time data — no user input reaches this string.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd />

      {/* ── header ── */}
      <header className="relative z-10">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-[0.95rem] text-parchment">
            <Wordmark />
            <span className="sr-only">AetherQuest home</span>
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/enter"
              className="rounded px-3 py-2 font-display text-xs tracking-[0.16em] uppercase text-parchment-dim transition-colors hover:text-gold"
            >
              Sign in
            </Link>
            <Link href="/enlist" className="seal-btn !px-4 !py-2 !text-[0.7rem]">
              Begin
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* ═══ hero ═══════════════════════════════════════════ */}
        <section
          aria-labelledby="hero-heading"
          className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-20 pt-6 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28 lg:pt-12"
        >
          <div>
            <p className="eyebrow ink-in mb-5 text-gold">
              A life RPG for anyone who has abandoned a habit app
            </p>
            <h1
              id="hero-heading"
              className="ink-in font-display text-[2.6rem] leading-[1.04] tracking-[0.01em] text-parchment sm:text-6xl lg:text-[4.1rem]"
              style={{ animationDelay: "80ms" }}
            >
              Keep your days
              <br />
              like a <span className="gilt">grimoire</span>.
            </h1>
            <p
              className="ink-in mt-6 max-w-xl text-lg leading-relaxed text-parchment-dim sm:text-xl"
              style={{ animationDelay: "160ms" }}
            >
              Write a habit down as a quest. Seal it when it is done. The
              experience, gold and streak arrive in that same instant — the
              reward a real day never hands out on the spot.
            </p>

            <div
              className="ink-in mt-9 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "240ms" }}
            >
              <Link href="/enlist" className="seal-btn !px-7 !py-3.5 !text-sm">
                <Icon.Quill className="size-4" />
                Begin your chronicle
              </Link>
              <Link href="/enter" className="rule-btn !px-5 !py-3">
                I already have a character
              </Link>
            </div>

            <p
              className="ink-in scribe mt-6 text-sm"
              style={{ animationDelay: "320ms" }}
            >
              Free. No card. Your first four quests are already written for you.
            </p>
          </div>

          <div className="ink-in relative" style={{ animationDelay: "200ms" }}>
            {/* lamplight behind the specimen */}
            <div
              aria-hidden="true"
              className="absolute -inset-10 -z-10 rounded-full opacity-70 blur-3xl"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(201,162,39,0.16), transparent)",
              }}
            />
            <SealDemo />
          </div>
        </section>

        {/* ═══ the loop ═══════════════════════════════════════ */}
        <section
          aria-labelledby="loop-heading"
          className="border-y border-ink-600 bg-ink-950/50"
        >
          <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24">
            <div className="mb-12 max-w-2xl">
              <p className="eyebrow mb-3">How it works</p>
              <h2
                id="loop-heading"
                className="font-display text-3xl text-parchment sm:text-4xl"
              >
                Three motions, repeated until they are who you are
              </h2>
            </div>

            <ol className="grid gap-5 md:grid-cols-3">
              {LOOP.map((step) => (
                <li key={step.title} className="plate plate--ruled p-6 sm:p-7">
                  <span className="numeral gilt font-display text-4xl">
                    {step.numeral}
                  </span>
                  <h3 className="mt-3 font-display text-xl tracking-[0.08em] text-parchment">
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-parchment-dim">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══ attributes ═════════════════════════════════════ */}
        <section
          aria-labelledby="attributes-heading"
          className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24"
        >
          <div className="mb-12 grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="eyebrow mb-3">The character sheet</p>
              <h2
                id="attributes-heading"
                className="font-display text-3xl text-parchment sm:text-4xl"
              >
                Five attributes. Every quest trains exactly one.
              </h2>
            </div>
            <p className="scribe text-lg lg:text-right">
              A month of reading shows up as Intellect. A month of avoiding the
              gym shows up too — as a Might bar that has not moved.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ATTRIBUTE_KEYS.map((key) => {
              const meta = ATTRIBUTES[key];
              return (
                <li
                  key={key}
                  data-tone={key}
                  className="plate group relative overflow-hidden p-5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--tone), transparent)",
                    }}
                  />
                  <span
                    className="grid size-12 place-items-center rounded-full border"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--tone) 50%, transparent)",
                      background:
                        "color-mix(in oklab, var(--tone) 10%, transparent)",
                      boxShadow: "0 0 26px -10px var(--tone)",
                    }}
                  >
                    <AttributeGlyph
                      attribute={key}
                      className="size-6 text-[var(--tone)]"
                    />
                  </span>
                  <h3 className="mt-4 font-display text-lg tracking-[0.1em] uppercase text-parchment">
                    {meta.name}
                  </h3>
                  <p className="scribe text-sm">{meta.blurb}</p>
                  <p className="mt-3 text-[0.8rem] leading-snug text-parchment-faint">
                    {meta.examples}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ═══ the arithmetic ═════════════════════════════════ */}
        <section
          aria-labelledby="numbers-heading"
          className="border-y border-ink-600 bg-ink-950/50"
        >
          <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:py-24">
            <div>
              <p className="eyebrow mb-3">The arithmetic</p>
              <h2
                id="numbers-heading"
                className="font-display text-3xl text-parchment sm:text-4xl"
              >
                The numbers are honest, and the server keeps them
              </h2>
              <p className="mt-5 leading-relaxed text-parchment-dim">
                Your browser never tells the server what a quest is worth. It
                names the quest; the server looks up the difficulty you set,
                applies your streak, and pays. There is no request you can edit
                to invent gold, and no way to seal the same daily quest twice in
                one day — not even from two tabs at once.
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {DIFFICULTY_KEYS.map((key) => {
                  const d = DIFFICULTIES[key];
                  return (
                    <div key={key} className="plate px-4 py-3">
                      <dt className="eyebrow !text-[0.6rem]">
                        <span className="numeral text-gold">{d.numeral}</span>{" "}
                        {d.name}
                      </dt>
                      <dd className="numeral mt-1 font-display text-parchment">
                        {d.xp} XP{" "}
                        <span className="text-[0.75rem] text-parchment-faint">
                          · {d.gold} gold
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="plate plate--ruled p-6">
                <h3 className="eyebrow mb-4 text-parchment-dim">
                  Cost of the next level
                </h3>
                <table className="w-full text-left">
                  <caption className="sr-only">
                    Experience required to advance from each level
                  </caption>
                  <thead>
                    <tr className="border-b border-ink-500">
                      <th scope="col" className="eyebrow pb-2 !text-[0.6rem] font-normal">
                        From level
                      </th>
                      <th scope="col" className="eyebrow pb-2 text-right !text-[0.6rem] font-normal">
                        XP needed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {LEVEL_ROWS.map((row) => (
                      <tr key={row.level} className="border-b border-ink-600/70 last:border-0">
                        <td className="numeral py-2 font-display text-parchment">
                          {row.level}
                        </td>
                        <td className="numeral py-2 text-right font-display text-gold">
                          {formatNumber(row.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="scribe mt-4 text-[0.8rem]">
                  Level ten costs nearly fourteen times what level one did.
                </p>
              </div>

              <div className="plate plate--ruled p-6">
                <h3 className="eyebrow mb-4 text-parchment-dim">
                  The streak bonus
                </h3>
                <ul className="space-y-3">
                  {STREAK_ROWS.map((row) => (
                    <li key={row.days}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="flex items-center gap-1.5 text-sm text-parchment">
                          <Icon.Flame className="size-3.5 text-seal-bright" />
                          <span className="numeral">{row.days}</span>{" "}
                          {row.days === 1 ? "day" : "days"}
                        </span>
                        <span className="numeral font-display text-gold">
                          +{row.bonus}%
                        </span>
                      </div>
                      <div className="vein h-1.5">
                        <div
                          className="vein__fill"
                          style={{ width: `${(row.bonus / 60) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="scribe mt-4 text-[0.8rem]">
                  Two percent more on every reward, for every day in a row, up
                  to {STREAK_BONUS_CAP_DAYS} days.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ the vault ══════════════════════════════════════ */}
        <section
          aria-labelledby="vault-heading"
          className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-24"
        >
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="eyebrow mb-3">The Vault</p>
              <h2
                id="vault-heading"
                className="font-display text-3xl text-parchment sm:text-4xl"
              >
                Gold buys who you are becoming
              </h2>
              <p className="mt-5 leading-relaxed text-parchment-dim">
                Eighteen sigils, titles and relics, from a common Ember to a
                legendary Ouroboros sealed until level eighteen. Wear a crest on
                your medallion and a title beneath your name. None of it is for
                sale for money — every piece is paid for in deeds.
              </p>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SPECIMENS.map((s, i) => (
                <li
                  key={s.name}
                  data-rarity={s.rarity}
                  className="plate relative flex flex-col items-center gap-3 overflow-hidden px-3 py-6 text-center"
                  style={{ transform: `translateY(${i % 2 === 0 ? 0 : 18}px)` }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, var(--rarity), transparent)",
                    }}
                  />
                  <span
                    className="grid size-16 place-items-center rounded-full border"
                    style={{
                      borderColor:
                        "color-mix(in oklab, var(--rarity) 50%, transparent)",
                      boxShadow: "0 0 30px -10px var(--rarity)",
                    }}
                  >
                    <SigilGlyph name={s.glyph} className="size-8 text-[var(--rarity)]" />
                  </span>
                  <span>
                    <span className="eyebrow block !text-[0.55rem] text-[var(--rarity)]">
                      {s.rarity}
                    </span>
                    <span className="font-display text-parchment">{s.name}</span>
                  </span>
                  <span className="numeral flex items-center gap-1 text-sm text-gold">
                    <Icon.Coin className="size-3.5" />
                    {formatNumber(s.price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ final call ═════════════════════════════════════ */}
        <section
          aria-labelledby="cta-heading"
          className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-8"
        >
          <div className="plate plate--ruled plate--cornered relative overflow-hidden px-6 py-16 text-center sm:px-12">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(60ch 30ch at 50% 0%, rgba(201,162,39,0.12), transparent 70%)",
              }}
            />
            <div className="relative">
              <Fleuron className="mx-auto mb-6 h-3.5 w-32 text-gold/60" />
              <h2
                id="cta-heading"
                className="font-display text-3xl text-parchment sm:text-5xl"
              >
                The first page is blank.
              </h2>
              <p className="scribe mx-auto mt-4 max-w-lg text-lg">
                It is also free, and it takes about thirty seconds to write your
                name on it.
              </p>
              <Link href="/enlist" className="seal-btn mt-9 !px-8 !py-3.5 !text-sm">
                Begin your chronicle
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-600">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-parchment-faint sm:flex-row sm:px-8">
          <Wordmark className="text-[0.75rem] text-parchment-dim" />
          <p className="scribe text-center text-[0.85rem]">
            Bound in Next.js and SQLite, by lamplight.
          </p>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href="/enter" className="transition-colors hover:text-gold">
              Sign in
            </Link>
            <Link href="/enlist" className="transition-colors hover:text-gold">
              Create a character
            </Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
