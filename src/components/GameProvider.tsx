"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { ApiError, api } from "@/lib/client";
import { levelState, rankState, type AttributeKey } from "@/lib/game";
import type { CompletionResult, QuestView, Snapshot } from "@/lib/types";
import type { CreateQuestInput, UpdateQuestInput } from "@/lib/validation";

/* ── the things the UI celebrates ──────────────────────────── */

export type Rite =
  | { kind: "level"; level: number }
  | { kind: "rank"; attribute: AttributeKey; name: string; rank: number };

export type Toast = {
  id: string;
  message: string;
  tone: "gold" | "seal" | "quiet";
};

/**
 * A short-lived "+50 XP" burst. It is positioned in viewport coordinates at
 * the control that was pressed, and rendered in a fixed overlay rather than
 * inside the quest card — the card moves to the sealed list the instant the
 * quest completes, and anything drawn inside it would vanish with it.
 */
export type Spark = {
  id: string;
  questId: string;
  xp: number;
  gold: number;
  x: number;
  y: number;
};

export type Point = { x: number; y: number };

type GameContextValue = {
  snapshot: Snapshot;
  /** Quest ids with a request in flight, for per-card pending states. */
  pending: ReadonlySet<string>;
  sparks: Spark[];
  rite: Rite | null;
  toasts: Toast[];
  dismissRite: () => void;
  dismissToast: (id: string) => void;
  notify: (message: string, tone?: Toast["tone"]) => void;
  completeQuest: (quest: QuestView, origin?: Point) => Promise<void>;
  undoQuest: (quest: QuestView) => Promise<void>;
  createQuest: (input: CreateQuestInput) => Promise<void>;
  updateQuest: (id: string, input: UpdateQuestInput) => Promise<void>;
  deleteQuest: (id: string) => Promise<void>;
  applySnapshot: (snapshot: Snapshot) => void;
  refresh: () => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used inside <GameProvider>.");
  }
  return context;
}

/* ═══ the optimistic model ═══════════════════════════════════════
   What the adventurer sees is:

       displayed = pendingOps.reduce(apply, confirmed)

   `confirmed` is only ever replaced by a snapshot the server sent.
   Each optimistic change is a small operation layered on top, and
   every `apply` is idempotent: an operation that the server snapshot
   already reflects changes nothing. So when a response lands, the
   finished operation can be dropped and the rest replayed without
   double-counting, and a failure rolls back exactly one operation
   and never anyone else's.

   Requests themselves go through a serial queue, so responses arrive
   in the order they were sent and an older snapshot can never
   overwrite a newer one.
   ═══════════════════════════════════════════════════════════════ */

type PendingOp =
  | { id: string; kind: "complete"; quest: QuestView }
  | { id: string; kind: "delete"; questId: string };

function applyCompletion(snapshot: Snapshot, quest: QuestView): Snapshot {
  const current = snapshot.quests.find((q) => q.id === quest.id);
  // Already sealed in this snapshot, or gone: nothing to project.
  if (!current || current.isComplete) return snapshot;

  const { xp, gold } = quest.award;
  const nextXp = snapshot.character.xp + xp;
  const level = levelState(nextXp);
  const streakRises = snapshot.character.lastActiveOn !== snapshot.today;

  return {
    ...snapshot,
    character: {
      ...snapshot.character,
      xp: nextXp,
      level: level.level,
      xpIntoLevel: level.xpIntoLevel,
      xpForNextLevel: level.xpForNextLevel,
      progress: level.progress,
      isMaxLevel: level.isMaxLevel,
      gold: snapshot.character.gold + gold,
      streak: streakRises
        ? snapshot.character.streak + 1
        : snapshot.character.streak,
      lastActiveOn: snapshot.today,
    },
    attributes: snapshot.attributes.map((attribute) => {
      if (attribute.key !== quest.attribute) return attribute;
      const next = rankState(attribute.xp + xp);
      return {
        ...attribute,
        xp: next.totalXp,
        rank: next.rank,
        title: next.title,
        xpIntoRank: next.xpIntoRank,
        xpForNextRank: next.xpForNextRank,
        progress: next.progress,
        isMaxRank: next.isMaxRank,
      };
    }),
    quests: snapshot.quests.map((q) =>
      q.id === quest.id
        ? { ...q, isComplete: true, lastCompletedOn: snapshot.today }
        : q,
    ),
    activity: snapshot.activity.map((day) =>
      day.day === snapshot.today
        ? { ...day, deeds: day.deeds + 1, xp: day.xp + xp }
        : day,
    ),
    totals: {
      deeds: snapshot.totals.deeds + 1,
      xpToday: snapshot.totals.xpToday + xp,
      deedsToday: snapshot.totals.deedsToday + 1,
    },
  };
}

function applyOp(snapshot: Snapshot, op: PendingOp): Snapshot {
  switch (op.kind) {
    case "complete":
      return applyCompletion(snapshot, op.quest);
    case "delete":
      return snapshot.quests.some((q) => q.id === op.questId)
        ? { ...snapshot, quests: snapshot.quests.filter((q) => q.id !== op.questId) }
        : snapshot;
  }
}

/* ── provider ──────────────────────────────────────────────── */

export function GameProvider({
  initialSnapshot,
  children,
}: {
  initialSnapshot: Snapshot;
  children: React.ReactNode;
}) {
  const [confirmed, setConfirmed] = useState<Snapshot>(initialSnapshot);
  const [ops, setOps] = useState<PendingOp[]>([]);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [rite, setRite] = useState<Rite | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const snapshot = useMemo(
    () => ops.reduce(applyOp, confirmed),
    [confirmed, ops],
  );

  // A ref, not state: a double-click lands twice in the same frame, before any
  // re-render could tell the second click that the first one happened.
  const inflight = useRef(new Set<string>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const riteQueue = useRef<Rite[]>([]);

  /** Runs `task` after every previously queued request has settled. */
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task, task);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  const notify = useCallback(
    (message: string, tone: Toast["tone"] = "quiet") => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      window.setTimeout(
        () => setToasts((current) => current.filter((t) => t.id !== id)),
        tone === "seal" ? 6000 : 4200,
      );
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const dismissRite = useCallback(() => {
    setRite(riteQueue.current.shift() ?? null);
  }, []);

  const queueRites = useCallback((rites: Rite[]) => {
    if (rites.length === 0) return;
    setRite((current) => {
      if (current) {
        riteQueue.current.push(...rites);
        return current;
      }
      riteQueue.current.push(...rites.slice(1));
      return rites[0];
    });
  }, []);

  const mark = useCallback((id: string, active: boolean) => {
    if (active) inflight.current.add(id);
    else inflight.current.delete(id);
    setPending(new Set(inflight.current));
  }, []);

  const dropOp = useCallback((opId: string) => {
    setOps((current) => current.filter((op) => op.id !== opId));
  }, []);

  /** For callers (the Vault) that receive a fresh snapshot of their own. */
  const applySnapshot = useCallback((next: Snapshot) => setConfirmed(next), []);

  const refresh = useCallback(() => {
    enqueue(() => api<{ snapshot: Snapshot }>("/api/quests"))
      .then(({ snapshot: fresh }) => setConfirmed(fresh))
      .catch(() => {
        // A failed background refresh is not worth interrupting anyone over.
      });
  }, [enqueue]);

  /* ── completing a quest: the central interaction ─────────── */

  const completeQuest = useCallback(
    async (quest: QuestView, origin?: Point) => {
      if (quest.isComplete || inflight.current.has(quest.id)) return;
      mark(quest.id, true);

      const op: PendingOp = { id: crypto.randomUUID(), kind: "complete", quest };

      // 1. Pay out instantly: the bar moves before the request leaves.
      setOps((current) => [...current, op]);
      setSparks((current) => [
        ...current,
        {
          id: op.id,
          questId: quest.id,
          xp: quest.award.xp,
          gold: quest.award.gold,
          x: origin?.x ?? window.innerWidth / 2,
          y: origin?.y ?? window.innerHeight / 2,
        },
      ]);
      window.setTimeout(
        () => setSparks((current) => current.filter((s) => s.id !== op.id)),
        1700,
      );

      // 2. Reconcile with the server, which is the only real authority.
      try {
        const result = await enqueue(() =>
          api<CompletionResult>(`/api/quests/${quest.id}/complete`, {
            method: "POST",
          }),
        );
        setConfirmed(result.snapshot);
        dropOp(op.id);

        const rites: Rite[] = [];
        if (result.leveledUpTo !== null) {
          rites.push({ kind: "level", level: result.leveledUpTo });
        }
        if (result.rankedUp) {
          rites.push({ kind: "rank", ...result.rankedUp });
        }
        queueRites(rites);
      } catch (error) {
        // 3. Take back exactly this payout — nothing else — and say why.
        dropOp(op.id);
        setSparks((current) => current.filter((s) => s.id !== op.id));
        notify(
          error instanceof ApiError
            ? error.message
            : "That deed could not be recorded.",
          "seal",
        );
      } finally {
        mark(quest.id, false);
      }
    },
    [dropOp, enqueue, mark, notify, queueRites],
  );

  /**
   * Undo is a correction rather than a reward, so it waits for the server
   * instead of guessing: reversing a deed can also rewind the streak, and the
   * interface should not flash a number it will immediately take back.
   */
  const undoQuest = useCallback(
    async (quest: QuestView) => {
      if (inflight.current.has(quest.id)) return;
      mark(quest.id, true);
      try {
        const { snapshot: next } = await enqueue(() =>
          api<{ snapshot: Snapshot }>(`/api/quests/${quest.id}/complete`, {
            method: "DELETE",
          }),
        );
        setConfirmed(next);
        notify(`“${quest.title}” was struck from today’s record.`, "quiet");
      } catch (error) {
        notify(
          error instanceof ApiError ? error.message : "That could not be undone.",
          "seal",
        );
      } finally {
        mark(quest.id, false);
      }
    },
    [enqueue, mark, notify],
  );

  /* ── quest CRUD ──────────────────────────────────────────── */

  const createQuest = useCallback(
    async (input: CreateQuestInput) => {
      const { snapshot: next } = await enqueue(() =>
        api<{ snapshot: Snapshot }>("/api/quests", {
          method: "POST",
          json: input,
        }),
      );
      setConfirmed(next);
      notify(`“${input.title}” was written into the log.`, "gold");
    },
    [enqueue, notify],
  );

  const updateQuest = useCallback(
    async (id: string, input: UpdateQuestInput) => {
      const { snapshot: next } = await enqueue(() =>
        api<{ snapshot: Snapshot }>(`/api/quests/${id}`, {
          method: "PATCH",
          json: input,
        }),
      );
      setConfirmed(next);
      notify("The quest was amended.", "quiet");
    },
    [enqueue, notify],
  );

  const deleteQuest = useCallback(
    async (id: string) => {
      if (inflight.current.has(id)) return;
      const title = snapshot.quests.find((q) => q.id === id)?.title;
      const op: PendingOp = { id: crypto.randomUUID(), kind: "delete", questId: id };

      // Optimistic: the card leaves the list immediately.
      setOps((current) => [...current, op]);
      mark(id, true);

      try {
        const { snapshot: next } = await enqueue(() =>
          api<{ snapshot: Snapshot }>(`/api/quests/${id}`, { method: "DELETE" }),
        );
        setConfirmed(next);
        dropOp(op.id);
        notify(
          title
            ? `“${title}” was torn from the log. Its past deeds remain in the Codex.`
            : "The quest was removed.",
          "quiet",
        );
      } catch (error) {
        dropOp(op.id);
        notify(
          error instanceof ApiError
            ? error.message
            : "That quest could not be removed.",
          "seal",
        );
      } finally {
        mark(id, false);
      }
    },
    [dropOp, enqueue, mark, notify, snapshot.quests],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      snapshot,
      pending,
      sparks,
      rite,
      toasts,
      dismissRite,
      dismissToast,
      notify,
      completeQuest,
      undoQuest,
      createQuest,
      updateQuest,
      deleteQuest,
      applySnapshot,
      refresh,
    }),
    [
      applySnapshot,
      completeQuest,
      createQuest,
      deleteQuest,
      dismissRite,
      dismissToast,
      notify,
      pending,
      refresh,
      rite,
      snapshot,
      sparks,
      toasts,
      undoQuest,
      updateQuest,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
