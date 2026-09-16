"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import {
  ATTRIBUTES,
  ATTRIBUTE_KEYS,
  DIFFICULTIES,
  DIFFICULTY_KEYS,
  type AttributeKey,
  type Cadence,
  type DifficultyKey,
} from "@/lib/game";
import type { QuestView } from "@/lib/types";
import { AttributeGlyph, Icon } from "./glyphs";
import { useGame } from "./GameProvider";
import { Spinner } from "./ui";

/* ── inline editor ─────────────────────────────────────────── */

function QuestEditor({
  quest,
  onDone,
}: {
  quest: QuestView;
  onDone: () => void;
}) {
  const { updateQuest, notify } = useGame();
  const [title, setTitle] = useState(quest.title);
  const [notes, setNotes] = useState(quest.notes ?? "");
  const [attribute, setAttribute] = useState<AttributeKey>(quest.attribute);
  const [difficulty, setDifficulty] = useState<DifficultyKey>(quest.difficulty);
  const [cadence, setCadence] = useState<Cadence>(quest.cadence);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError("A quest needs a name.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateQuest(quest.id, {
        title: trimmed,
        notes: notes.trim() || null,
        attribute,
        difficulty,
        cadence,
      });
      onDone();
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "That could not be saved.";
      setError(message);
      notify(message, "seal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div className="space-y-3 border-t border-ink-500 px-4 py-4">
        <div>
          <label htmlFor={`t-${quest.id}`} className="eyebrow mb-1 block">
            Quest
          </label>
          <input
            id={`t-${quest.id}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="field"
            aria-invalid={error ? true : undefined}
          />
        </div>

        <div>
          <label htmlFor={`n-${quest.id}`} className="eyebrow mb-1 block">
            Notes
          </label>
          <input
            id={`n-${quest.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            placeholder="Optional"
            className="field"
          />
        </div>

        <fieldset>
          <legend className="eyebrow mb-1.5">Trains</legend>
          <div className="flex flex-wrap gap-1.5">
            {ATTRIBUTE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                data-tone={key}
                data-active={attribute === key}
                aria-pressed={attribute === key}
                onClick={() => setAttribute(key)}
                className="rule-btn !px-2.5 !py-1.5 !text-[0.65rem]"
              >
                <AttributeGlyph attribute={key} className="size-3.5" />
                {ATTRIBUTES[key].name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-4">
          <fieldset>
            <legend className="eyebrow mb-1.5">Difficulty</legend>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  data-active={difficulty === key}
                  aria-pressed={difficulty === key}
                  onClick={() => setDifficulty(key)}
                  className="rule-btn !px-2.5 !py-1.5 !text-[0.65rem]"
                >
                  {DIFFICULTIES[key].name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="eyebrow mb-1.5">Repeats</legend>
            <div className="flex gap-1.5">
              {(["daily", "once"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  data-active={cadence === key}
                  aria-pressed={cadence === key}
                  onClick={() => setCadence(key)}
                  className="rule-btn !px-2.5 !py-1.5 !text-[0.65rem]"
                >
                  {key === "daily" ? "Every day" : "Once"}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {error ? (
          <p role="alert" className="text-xs text-seal-bright">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={busy} className="seal-btn !py-2 !text-xs">
            {busy ? <Spinner className="size-3.5" /> : null}
            Save
          </button>
          <button type="button" onClick={onDone} className="rule-btn">
            Cancel
          </button>
        </div>
      </div>
    </motion.form>
  );
}

/* ── the card ──────────────────────────────────────────────── */

export function QuestCard({ quest, index }: { quest: QuestView; index: number }) {
  const { completeQuest, undoQuest, deleteQuest, pending } = useGame();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const busy = pending.has(quest.id);
  const meta = ATTRIBUTES[quest.attribute];
  const difficulty = DIFFICULTIES[quest.difficulty];

  return (
    <motion.li
      layout
      data-tone={quest.attribute}
      style={{ ["--i" as string]: index }}
      initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      className={`plate relative ${
        quest.isComplete ? "opacity-70" : ""
      } transition-opacity`}
    >
      {/* A tinted spine down the left edge, coloured by attribute. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-[3px]"
        style={{
          background: quest.isComplete
            ? "var(--color-ink-400)"
            : "linear-gradient(180deg, var(--tone), color-mix(in oklab, var(--tone) 35%, transparent))",
          boxShadow: quest.isComplete ? undefined : "0 0 12px -3px var(--tone)",
        }}
      />

      <div className="flex items-start gap-3.5 p-4 pl-5">
        {/* attribute mark */}
        <div
          className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border"
          style={{
            borderColor: quest.isComplete
              ? "var(--color-ink-500)"
              : "color-mix(in oklab, var(--tone) 45%, transparent)",
            background: quest.isComplete
              ? "rgba(5,4,3,0.5)"
              : "color-mix(in oklab, var(--tone) 12%, transparent)",
          }}
        >
          <AttributeGlyph
            attribute={quest.attribute}
            className={`size-5 ${quest.isComplete ? "text-ink-400" : "text-[var(--tone)]"}`}
          />
        </div>

        {/* body */}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[1.02rem] leading-snug text-parchment">
            <span className={quest.isComplete ? "struck" : undefined}>
              {quest.title}
            </span>
          </h3>

          {quest.notes ? (
            <p className="scribe mt-0.5 text-[0.85rem] leading-snug">
              {quest.notes}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-parchment-faint">
            <span className="inline-flex items-center gap-1">
              <span
                className="numeral font-display text-[0.68rem] tracking-widest text-[var(--tone)]"
                aria-hidden="true"
              >
                {difficulty.numeral}
              </span>
              {difficulty.name}
            </span>
            <span aria-hidden="true">·</span>
            <span>{meta.name}</span>
            <span aria-hidden="true">·</span>
            <span>{quest.cadence === "daily" ? "Every day" : "One time"}</span>
            {!quest.isComplete ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-gold">
                  <span className="numeral">+{quest.award.xp}</span> XP,{" "}
                  <span className="numeral">+{quest.award.gold}</span> gold
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {quest.isComplete ? (
            <button
              type="button"
              onClick={() => undoQuest(quest)}
              disabled={busy}
              aria-label={`Undo today’s completion of “${quest.title}”`}
              className="rule-btn !px-3 !py-1.5 !text-[0.65rem]"
            >
              {busy ? <Spinner className="size-3" /> : <Icon.Undo className="size-3.5" />}
              Undo
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                // Keyboard activation fires click too, so this covers Enter
                // and Space as well as the pointer.
                const rect = event.currentTarget.getBoundingClientRect();
                completeQuest(quest, {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                });
              }}
              disabled={busy}
              aria-label={`Seal “${quest.title}” for ${quest.award.xp} XP and ${quest.award.gold} gold`}
              className="seal-btn !px-4 !py-2 !text-[0.7rem]"
            >
              {busy ? (
                <Spinner className="size-3.5" />
              ) : (
                <Icon.Check className="size-4" />
              )}
              <span className="hidden sm:inline">Seal</span>
            </button>
          )}

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                setEditing((v) => !v);
                setConfirmingDelete(false);
              }}
              aria-expanded={editing}
              className="rounded p-1.5 text-parchment-faint transition-colors hover:text-gold focus-visible:text-gold"
            >
              <Icon.Quill className="size-3.5" />
              <span className="sr-only">Edit {quest.title}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete((v) => !v)}
              aria-expanded={confirmingDelete}
              className="rounded p-1.5 text-parchment-faint transition-colors hover:text-seal-bright focus-visible:text-seal-bright"
            >
              <Icon.Trash className="size-3.5" />
              <span className="sr-only">Delete {quest.title}</span>
            </button>
          </div>
        </div>
      </div>

      {/* delete confirmation, inline rather than in a modal */}
      <AnimatePresence initial={false}>
        {confirmingDelete ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 border-t border-ink-500 bg-seal/10 px-4 py-3">
              <p className="flex-1 text-[0.8rem] text-parchment-dim">
                Tear <span className="text-parchment">{quest.title}</span> from
                the log? Deeds already recorded stay in the Codex.
              </p>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  deleteQuest(quest.id);
                }}
                className="seal-btn !px-3 !py-1.5 !text-[0.65rem]"
              >
                Tear it out
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rule-btn !px-3 !py-1.5 !text-[0.65rem]"
              >
                Keep it
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {editing ? (
          <QuestEditor quest={quest} onDone={() => setEditing(false)} />
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
