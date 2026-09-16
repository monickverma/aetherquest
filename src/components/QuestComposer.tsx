"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import {
  ATTRIBUTES,
  ATTRIBUTE_KEYS,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  computeAward,
  type AttributeKey,
  type Cadence,
  type DifficultyKey,
} from "@/lib/game";
import { AttributeGlyph, Icon } from "./glyphs";
import { useGame } from "./GameProvider";
import { Spinner } from "./ui";

export function QuestComposer() {
  const { createQuest, snapshot } = useGame();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [attribute, setAttribute] = useState<AttributeKey>("discipline");
  const [difficulty, setDifficulty] = useState<DifficultyKey>("standard");
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  // The reward is quoted live, including the streak bonus already in effect.
  const preview = computeAward(
    difficulty,
    Math.max(1, snapshot.character.streak),
  );

  function reset() {
    setTitle("");
    setNotes("");
    setAttribute("discipline");
    setDifficulty("standard");
    setCadence("daily");
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();

    if (!trimmed) {
      setError("A quest needs a name before it can be written down.");
      titleRef.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await createQuest({
        title: trimmed,
        notes: notes.trim() || null,
        attribute,
        difficulty,
        cadence,
      });
      reset();
      setOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That quest could not be written down.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="plate plate--ruled overflow-hidden">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gold/5"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-dashed border-ink-400 text-parchment-faint transition-colors group-hover:border-gold/60 group-hover:text-gold">
            <Icon.Plus className="size-4" />
          </span>
          <span className="font-display text-sm tracking-[0.14em] uppercase text-parchment-dim transition-colors group-hover:text-parchment">
            Inscribe a new quest
          </span>
        </button>
      ) : (
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
          className="space-y-4 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="eyebrow">New quest</h3>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="rounded p-1 text-parchment-faint transition-colors hover:text-parchment"
            >
              <Icon.Close className="size-4" />
              <span className="sr-only">Close the composer</span>
            </button>
          </div>

          <div>
            <label htmlFor="quest-title" className="sr-only">
              What is the quest?
            </label>
            <input
              ref={titleRef}
              id="quest-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              maxLength={120}
              placeholder="Run three miles before the sun is up"
              className="field !text-base"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "quest-error" : undefined}
            />
            {error ? (
              <p
                id="quest-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs text-seal-bright"
              >
                <Icon.Warning className="size-3.5 shrink-0" />
                {error}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="quest-notes" className="sr-only">
              Notes
            </label>
            <input
              id="quest-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder="A note to your future self (optional)"
              className="field !text-sm"
            />
          </div>

          <fieldset>
            <legend className="eyebrow mb-2">Which attribute does it train?</legend>
            <div className="flex flex-wrap gap-2">
              {ATTRIBUTE_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  data-tone={key}
                  data-active={attribute === key}
                  aria-pressed={attribute === key}
                  onClick={() => setAttribute(key)}
                  className="rule-btn !px-3 !py-2"
                  style={
                    attribute === key
                      ? {
                          color: "var(--tone)",
                          borderColor: "color-mix(in oklab, var(--tone) 55%, transparent)",
                          backgroundColor: "color-mix(in oklab, var(--tone) 12%, transparent)",
                        }
                      : undefined
                  }
                >
                  <AttributeGlyph attribute={key} className="size-4" />
                  {ATTRIBUTES[key].name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.72rem] text-parchment-faint">
              {ATTRIBUTES[attribute].blurb} — {ATTRIBUTES[attribute].examples}.
            </p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <fieldset>
              <legend className="eyebrow mb-2">How hard is it?</legend>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    data-active={difficulty === key}
                    aria-pressed={difficulty === key}
                    onClick={() => setDifficulty(key)}
                    className="rule-btn !px-3 !py-2"
                  >
                    <span className="numeral opacity-60" aria-hidden="true">
                      {DIFFICULTIES[key].numeral}
                    </span>
                    {DIFFICULTIES[key].name}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="eyebrow mb-2">Repeats</legend>
              <div className="flex gap-2">
                {(["daily", "once"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    data-active={cadence === key}
                    aria-pressed={cadence === key}
                    onClick={() => setCadence(key)}
                    className="rule-btn !px-3 !py-2"
                  >
                    {key === "daily" ? "Every day" : "Once"}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-500 pt-4">
            <p className="text-[0.78rem] text-parchment-faint">
              Pays{" "}
              <span className="numeral text-gold">+{preview.xp}</span> XP and{" "}
              <span className="numeral text-gold">+{preview.gold}</span> gold
              {snapshot.character.streak > 0 ? (
                <span className="scribe not-italic">
                  {" "}
                  (streak bonus included)
                </span>
              ) : null}
            </p>

            <button type="submit" disabled={busy} className="seal-btn">
              {busy ? <Spinner className="size-4" /> : <Icon.Quill className="size-4" />}
              Write it down
            </button>
          </div>
        </motion.form>
      )}
    </div>
  );
}
