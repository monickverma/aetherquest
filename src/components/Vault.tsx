"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

import { ApiError, api } from "@/lib/client";
import { formatNumber } from "@/lib/game";
import type { ItemView, Snapshot } from "@/lib/types";
import { Fleuron, Icon, SigilGlyph } from "./glyphs";
import { useGame } from "./GameProvider";
import { Spinner } from "./ui";

type VaultState = { items: ItemView[]; gold: number; level: number };
type Kind = ItemView["kind"];

const SHELVES: { kind: Kind; label: string; blurb: string }[] = [
  {
    kind: "sigil",
    label: "Sigils",
    blurb: "A crest worn on your medallion. One at a time.",
  },
  {
    kind: "title",
    label: "Titles",
    blurb: "A line written beneath your name. One at a time.",
  },
  {
    kind: "relic",
    label: "Relics",
    blurb: "Trophies for the shelf. Collect as many as you can afford.",
  },
];

const RARITY_LABEL: Record<ItemView["rarity"], string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/* ── the portrait: how you look right now ──────────────────── */

function Portrait({ snapshot }: { snapshot: Snapshot }) {
  const { character } = snapshot;
  return (
    <div className="plate plate--ruled plate--cornered flex items-center gap-5 p-5 sm:p-6">
      <div
        className="grid size-20 shrink-0 place-items-center rounded-full border border-gold/50"
        style={{
          background:
            "radial-gradient(120% 130% at 32% 18%, rgba(201,162,39,0.24), transparent 58%), linear-gradient(170deg, var(--color-ink-700), var(--color-ink-900))",
          boxShadow:
            "inset 0 1px 0 rgba(201,162,39,0.3), 0 0 30px -10px var(--color-gold)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={character.sigil ?? "none"}
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <SigilGlyph name={character.sigil} className="size-10 text-gold" />
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="min-w-0 flex-1">
        <p className="eyebrow mb-1">As the world sees you</p>
        <p className="truncate font-display text-xl text-parchment">
          {character.name}
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={character.title ?? "none"}
            initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
            transition={{ duration: 0.25 }}
            className={
              character.title
                ? "gilt truncate font-display text-[0.78rem] tracking-[0.2em] uppercase"
                : "scribe text-sm"
            }
          >
            {character.title ?? "No title worn"}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="hidden text-right sm:block">
        <p className="eyebrow mb-1">Purse</p>
        <p className="numeral flex items-center justify-end gap-1.5 font-display text-2xl text-gold">
          <Icon.Coin className="size-5" />
          {formatNumber(character.gold)}
        </p>
        <p className="text-[0.72rem] text-parchment-faint">
          Level <span className="numeral">{character.level}</span>
        </p>
      </div>
    </div>
  );
}

/* ── a single item ─────────────────────────────────────────── */

function ItemCard({
  item,
  busy,
  onBuy,
  onEquip,
}: {
  item: ItemView;
  busy: boolean;
  onBuy: (item: ItemView) => void;
  onEquip: (item: ItemView, equip: boolean) => void;
}) {
  const wearable = item.kind !== "relic";
  const locked = !item.owned && item.lockedReason !== null;
  const levelLocked = locked && item.lockedReason?.startsWith("Requires");

  return (
    <motion.li
      layout
      data-rarity={item.rarity}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className={`plate relative flex flex-col overflow-hidden p-4 ${
        item.equipped ? "ring-1 ring-gold/60" : ""
      }`}
      style={{
        borderColor: item.owned
          ? "color-mix(in oklab, var(--rarity) 55%, var(--color-ink-500))"
          : undefined,
      }}
    >
      {/* rarity wash across the top edge */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--rarity), transparent)",
          opacity: levelLocked ? 0.35 : 0.9,
        }}
      />

      <div className="flex items-start gap-3.5">
        <div
          className={`grid size-12 shrink-0 place-items-center rounded-full border ${
            levelLocked ? "opacity-40" : ""
          }`}
          style={{
            borderColor:
              "color-mix(in oklab, var(--rarity) 50%, transparent)",
            background:
              "radial-gradient(circle at 35% 25%, color-mix(in oklab, var(--rarity) 22%, transparent), transparent 70%)",
          }}
        >
          {item.kind === "title" ? (
            <span
              className="font-display text-lg text-[var(--rarity)]"
              aria-hidden="true"
            >
              {item.name.replace(/^The /, "").charAt(0)}
            </span>
          ) : (
            <SigilGlyph
              name={item.glyph}
              className="size-6 text-[var(--rarity)]"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="eyebrow !text-[0.58rem] !tracking-[0.26em] text-[var(--rarity)]">
            {RARITY_LABEL[item.rarity]}
          </p>
          <h3
            className={`font-display text-[1.02rem] leading-tight ${
              levelLocked ? "text-parchment-faint" : "text-parchment"
            }`}
          >
            {item.name}
          </h3>
        </div>

        {item.equipped ? (
          <span className="eyebrow shrink-0 rounded-sm border border-gold/50 bg-gold/10 px-2 py-0.5 !text-[0.56rem] text-gold">
            Worn
          </span>
        ) : item.owned ? (
          <span className="eyebrow shrink-0 !text-[0.56rem] text-parchment-dim">
            Owned
          </span>
        ) : null}
      </div>

      <p
        className={`scribe mt-3 flex-1 text-[0.86rem] leading-snug ${
          levelLocked ? "opacity-60" : ""
        }`}
      >
        {item.description}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-600 pt-3">
        {item.owned ? (
          <span className="text-[0.72rem] text-parchment-faint">
            {wearable ? "In your wardrobe" : "On your shelf"}
          </span>
        ) : (
          <span className="flex items-baseline gap-2">
            <span className="numeral flex items-center gap-1 font-display text-base text-gold">
              <Icon.Coin className="size-3.5 translate-y-px" />
              {formatNumber(item.price)}
            </span>
            {item.requiredLevel > 1 ? (
              <span className="text-[0.68rem] text-parchment-faint">
                Lv <span className="numeral">{item.requiredLevel}</span>
              </span>
            ) : null}
          </span>
        )}

        {item.owned ? (
          wearable ? (
            <button
              type="button"
              onClick={() => onEquip(item, !item.equipped)}
              disabled={busy}
              className="rule-btn !px-3 !py-1.5 !text-[0.65rem]"
            >
              {busy ? <Spinner className="size-3" /> : null}
              {item.equipped ? "Remove" : "Wear"}
              <span className="sr-only"> {item.name}</span>
            </button>
          ) : null
        ) : (
          <button
            type="button"
            onClick={() => onBuy(item)}
            disabled={busy || locked}
            aria-describedby={locked ? `lock-${item.id}` : undefined}
            className="seal-btn seal-btn--gold !px-3.5 !py-1.5 !text-[0.65rem]"
          >
            {busy ? <Spinner className="size-3" /> : null}
            Buy<span className="sr-only"> {item.name}</span>
          </button>
        )}
      </div>

      {locked ? (
        <p
          id={`lock-${item.id}`}
          className="mt-2 text-right text-[0.68rem] text-seal-bright"
        >
          {item.lockedReason}
        </p>
      ) : null}
    </motion.li>
  );
}

/* ── the vault ─────────────────────────────────────────────── */

export function Vault({ initialVault }: { initialVault: VaultState }) {
  const { snapshot, applySnapshot, notify } = useGame();
  const [vault, setVault] = useState<VaultState>(initialVault);
  const [shelf, setShelf] = useState<Kind>("sigil");
  const [busyId, setBusyId] = useState<string | null>(null);
  const tabRefs = useRef<Record<Kind, HTMLButtonElement | null>>({
    sigil: null,
    title: null,
    relic: null,
  });

  /* Roving tabindex: arrow keys move between shelves, as a tablist should. */
  function onTabKey(event: React.KeyboardEvent, index: number) {
    const last = SHELVES.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    const kind = SHELVES[next].kind;
    setShelf(kind);
    tabRefs.current[kind]?.focus();
  }

  async function buy(item: ItemView) {
    if (busyId) return;
    const previousVault = vault;
    const previousSnapshot = snapshot;

    // Optimistic: coins leave the purse and the item lands in the wardrobe.
    setBusyId(item.id);
    setVault({
      ...vault,
      gold: vault.gold - item.price,
      items: vault.items.map((i) =>
        i.id === item.id ? { ...i, owned: true, lockedReason: null } : i,
      ),
    });
    applySnapshot({
      ...snapshot,
      character: {
        ...snapshot.character,
        gold: snapshot.character.gold - item.price,
      },
    });

    try {
      const result = await api<{ snapshot: Snapshot; vault: VaultState }>(
        "/api/vault/buy",
        { method: "POST", json: { itemId: item.id } },
      );
      setVault(result.vault);
      applySnapshot(result.snapshot);
      notify(
        item.kind === "relic"
          ? `${item.name} now sits on your shelf.`
          : `${item.name} is yours. Wear it from the card.`,
        "gold",
      );
    } catch (error) {
      setVault(previousVault);
      applySnapshot(previousSnapshot);
      notify(
        error instanceof ApiError ? error.message : "The purchase failed.",
        "seal",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function equip(item: ItemView, wear: boolean) {
    if (busyId || item.kind === "relic") return;
    setBusyId(item.id);
    try {
      const result = await api<{ snapshot: Snapshot; vault: VaultState }>(
        "/api/vault/equip",
        {
          method: "POST",
          json: { slot: item.kind, itemId: wear ? item.id : null },
        },
      );
      setVault(result.vault);
      applySnapshot(result.snapshot);
      notify(
        wear ? `You now wear ${item.name}.` : `${item.name} was set aside.`,
        "quiet",
      );
    } catch (error) {
      notify(
        error instanceof ApiError ? error.message : "That could not be worn.",
        "seal",
      );
    } finally {
      setBusyId(null);
    }
  }

  const active = SHELVES.find((s) => s.kind === shelf)!;
  const onShelf = vault.items.filter((i) => i.kind === shelf);
  const ownedCount = vault.items.filter((i) => i.owned).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-wide text-parchment sm:text-[1.75rem]">
            The Vault
          </h1>
          <p className="scribe text-sm">
            Gold is earned one deed at a time. Spend it on who you are becoming.
          </p>
        </div>
        <p className="text-[0.78rem] text-parchment-faint">
          <span className="numeral text-gold">{ownedCount}</span> of{" "}
          <span className="numeral">{vault.items.length}</span> collected
        </p>
      </header>

      <Portrait snapshot={snapshot} />

      <div>
        <div
          role="tablist"
          aria-label="Vault shelves"
          className="flex gap-1 border-b border-ink-600"
        >
          {SHELVES.map((s, index) => {
            const selected = s.kind === shelf;
            const count = vault.items.filter(
              (i) => i.kind === s.kind && i.owned,
            ).length;
            return (
              <button
                key={s.kind}
                ref={(el) => {
                  tabRefs.current[s.kind] = el;
                }}
                role="tab"
                id={`tab-${s.kind}`}
                aria-selected={selected}
                aria-controls={`shelf-${s.kind}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setShelf(s.kind)}
                onKeyDown={(e) => onTabKey(e, index)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 font-display text-xs tracking-[0.16em] uppercase transition-colors ${
                  selected
                    ? "border-gold text-gold"
                    : "border-transparent text-parchment-faint hover:text-parchment"
                }`}
              >
                {s.label}
                <span className="numeral text-[0.65rem] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`shelf-${shelf}`}
          aria-labelledby={`tab-${shelf}`}
          tabIndex={0}
          className="pt-4 focus-visible:outline-offset-8"
        >
          <p className="scribe mb-4 text-sm">{active.blurb}</p>

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {onShelf.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                busy={busyId === item.id}
                onBuy={buy}
                onEquip={equip}
              />
            ))}
          </ul>
        </div>
      </div>

      <Fleuron className="mx-auto h-3 w-32 text-ink-400" />
    </div>
  );
}
