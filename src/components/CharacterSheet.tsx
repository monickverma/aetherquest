"use client";

import { motion } from "motion/react";

import { ATTRIBUTES, formatNumber } from "@/lib/game";
import type { AttributeView, DayActivity, CharacterView } from "@/lib/types";
import { AttributeGlyph, Fleuron, Icon, SigilGlyph } from "./glyphs";
import { useGame } from "./GameProvider";
import { Vein } from "./ui";

/* ── the crest ─────────────────────────────────────────────── */

function Crest({ character }: { character: CharacterView }) {
  return (
    <div className="relative shrink-0">
      <div
        className="grid size-[4.5rem] place-items-center rounded-full border border-gold/45"
        style={{
          background:
            "radial-gradient(120% 130% at 32% 18%, rgba(201,162,39,0.22), transparent 58%), linear-gradient(170deg, var(--color-ink-700), var(--color-ink-900))",
          boxShadow: "inset 0 1px 0 rgba(201,162,39,0.28), 0 0 22px -8px var(--color-gold)",
        }}
      >
        <SigilGlyph
          name={character.sigil}
          className="size-9 text-gold flicker"
        />
      </div>

      {/* Level, struck into the rim of the medallion. */}
      <div
        className="absolute -bottom-1 -right-1 grid min-w-8 place-items-center rounded-full border border-gold/60 px-1.5 py-0.5"
        style={{
          background: "linear-gradient(170deg, var(--color-gold-bright), var(--color-gold-deep))",
        }}
      >
        <span className="numeral font-display text-xs font-bold leading-none text-ink-950">
          {character.level}
        </span>
      </div>
    </div>
  );
}

/* ── one attribute row ─────────────────────────────────────── */

function AttributeRow({ attribute }: { attribute: AttributeView }) {
  const meta = ATTRIBUTES[attribute.key];
  return (
    <li data-tone={attribute.tone} className="group">
      <div className="mb-1.5 flex items-baseline gap-2">
        <AttributeGlyph
          attribute={attribute.key}
          className="size-4 shrink-0 translate-y-0.5 text-[var(--tone)]"
        />
        <span className="font-display text-[0.8rem] tracking-[0.12em] uppercase text-parchment">
          {attribute.name}
        </span>
        <span className="ml-auto flex items-baseline gap-1.5">
          <span className="scribe text-[0.7rem] not-italic tracking-wide text-parchment-faint">
            {attribute.title}
          </span>
          <span className="numeral font-display text-sm text-[var(--tone)]">
            {attribute.rank}
          </span>
        </span>
      </div>

      <Vein
        value={attribute.isMaxRank ? 1 : attribute.xpIntoRank}
        max={attribute.isMaxRank ? 1 : attribute.xpForNextRank}
        tone
        className="h-1.5"
        label={`${attribute.name}: rank ${attribute.rank}, ${
          attribute.isMaxRank
            ? "mastered"
            : `${attribute.xpIntoRank} of ${attribute.xpForNextRank} XP to rank ${attribute.rank + 1}`
        }`}
      />

      {/* Revealed on hover or keyboard focus within the sheet. */}
      <p className="mt-1 text-[0.7rem] text-parchment-faint opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none">
        {meta.examples}
      </p>
    </li>
  );
}

/* ── the fourteen-day ribbon ───────────────────────────────── */

function ActivityRibbon({ activity }: { activity: DayActivity[] }) {
  const busiest = Math.max(1, ...activity.map((d) => d.deeds));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="eyebrow">Last fourteen days</h3>
        <span className="scribe text-[0.7rem] not-italic text-parchment-faint">
          {activity.reduce((sum, d) => sum + d.deeds, 0)} deeds
        </span>
      </div>

      <ol className="flex gap-1">
        {activity.map((day, i) => {
          const intensity = day.deeds === 0 ? 0 : 0.25 + (day.deeds / busiest) * 0.75;
          const isToday = i === activity.length - 1;
          return (
            <li key={day.day} className="flex-1">
              <div
                title={`${day.day}: ${day.deeds} deed${day.deeds === 1 ? "" : "s"}, ${day.xp} XP`}
                className={`h-7 rounded-[2px] border transition-colors duration-300 ${
                  isToday ? "border-gold/60" : "border-ink-500"
                }`}
                style={{
                  background:
                    day.deeds === 0
                      ? "rgba(5,4,3,0.6)"
                      : `color-mix(in oklab, var(--color-gold) ${intensity * 85}%, var(--color-ink-800))`,
                  boxShadow:
                    day.deeds > 0
                      ? `0 0 10px -4px var(--color-gold)`
                      : undefined,
                }}
              />
              <span className="sr-only">
                {day.day}: {day.deeds} deeds, {day.xp} XP
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── the sheet ─────────────────────────────────────────────── */

export function CharacterSheet() {
  const { snapshot } = useGame();
  const { character, attributes, totals } = snapshot;

  return (
    <aside
      className="plate plate--ruled ink-in p-5 sm:p-6"
      aria-label="Character sheet"
    >
      {/* ── identity ── */}
      <div className="flex items-center gap-4">
        <Crest character={character} />

        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 break-words font-display text-xl leading-tight text-parchment">
            {character.name}
          </h2>
          {character.title ? (
            <p className="gilt truncate font-display text-[0.78rem] tracking-[0.2em] uppercase">
              {character.title}
            </p>
          ) : (
            <p className="scribe text-[0.8rem]">Untitled, for now</p>
          )}
        </div>
      </div>

      {/* ── level and experience ── */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="eyebrow">
            Level <span className="numeral text-gold">{character.level}</span>
          </span>
          <span className="numeral text-[0.72rem] text-parchment-faint">
            {character.isMaxLevel
              ? "Mastery attained"
              : `${formatNumber(character.xpIntoLevel)} / ${formatNumber(character.xpForNextLevel)} XP`}
          </span>
        </div>

        <Vein
          value={character.isMaxLevel ? 1 : character.xpIntoLevel}
          max={character.isMaxLevel ? 1 : character.xpForNextLevel}
          className="h-2.5"
          label={
            character.isMaxLevel
              ? "Maximum level reached"
              : `Level ${character.level}: ${character.xpIntoLevel} of ${character.xpForNextLevel} XP toward level ${character.level + 1}`
          }
        />

        <p className="mt-1.5 text-[0.72rem] text-parchment-faint">
          {character.isMaxLevel ? (
            "There is nothing above this."
          ) : (
            <>
              <span className="numeral text-parchment-dim">
                {formatNumber(character.xpForNextLevel - character.xpIntoLevel)}
              </span>{" "}
              XP until level {character.level + 1}
            </>
          )}
        </p>
      </div>

      {/* ── purse and streak ── */}
      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="plate flex items-center gap-2.5 px-3 py-2.5">
          <Icon.Coin className="size-5 shrink-0 text-gold" />
          <div className="min-w-0">
            <dt className="eyebrow text-[0.6rem]">Gold</dt>
            <dd className="numeral font-display text-lg leading-tight text-gold">
              <motion.span
                key={character.gold}
                initial={{ opacity: 0.4, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="inline-block"
              >
                {formatNumber(character.gold)}
              </motion.span>
            </dd>
          </div>
        </div>

        <div className="plate flex items-center gap-2.5 px-3 py-2.5">
          <Icon.Flame
            className={`size-5 shrink-0 ${
              character.streak > 0 ? "text-seal-bright flicker" : "text-ink-400"
            }`}
          />
          <div className="min-w-0">
            <dt className="eyebrow text-[0.6rem]">Streak</dt>
            <dd className="numeral font-display text-lg leading-tight text-parchment">
              {character.streak}
              <span className="ml-1 font-body text-[0.7rem] tracking-normal text-parchment-faint">
                {character.streak === 1 ? "day" : "days"}
              </span>
            </dd>
          </div>
        </div>
      </dl>

      {character.streak > 0 ? (
        <p className="mt-2 text-center text-[0.72rem] text-parchment-faint">
          Streak bonus{" "}
          <span className="numeral text-gold">
            +{Math.min(character.streak, 30) * 2}%
          </span>{" "}
          to all rewards
          {character.longestStreak > character.streak ? (
            <> · best {character.longestStreak}</>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-center text-[0.72rem] text-parchment-faint">
          Complete one quest to light the streak.
        </p>
      )}

      <Fleuron className="mx-auto my-5 h-3 w-32 text-ink-400" />

      {/* ── attributes ── */}
      <h3 className="eyebrow mb-3">Attributes</h3>
      <ul className="space-y-3.5">
        {attributes.map((attribute) => (
          <AttributeRow key={attribute.key} attribute={attribute} />
        ))}
      </ul>

      <Fleuron className="mx-auto my-5 h-3 w-32 text-ink-400" />

      <ActivityRibbon activity={snapshot.activity} />

      <p className="mt-4 text-center text-[0.72rem] text-parchment-faint">
        <span className="numeral text-parchment-dim">{totals.deedsToday}</span>{" "}
        {totals.deedsToday === 1 ? "deed" : "deeds"} today ·{" "}
        <span className="numeral text-parchment-dim">
          {formatNumber(totals.xpToday)}
        </span>{" "}
        XP earned ·{" "}
        <span className="numeral text-parchment-dim">
          {formatNumber(totals.deeds)}
        </span>{" "}
        all time
      </p>
    </aside>
  );
}
