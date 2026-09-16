"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/lib/client";
import { formatNumber } from "@/lib/game";
import { ConnectionBanner } from "./ConnectionBanner";
import { Icon, Wordmark } from "./glyphs";
import { useGame } from "./GameProvider";
import { LevelUpRite } from "./LevelUpRite";
import { SparkLayer } from "./SparkLayer";
import { Toasts } from "./Toasts";
import { Spinner } from "./ui";

const NAV = [
  { href: "/sanctum", label: "Sanctum", icon: Icon.Sanctum },
  { href: "/codex", label: "Codex", icon: Icon.Scroll },
  { href: "/vault", label: "Vault", icon: Icon.Vault },
] as const;

function SignOut() {
  const router = useRouter();
  const { notify } = useGame();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } catch {
      notify("Could not sign out. Check your connection.", "seal");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded p-2 text-parchment-faint transition-colors hover:text-seal-bright focus-visible:text-seal-bright"
    >
      {busy ? <Spinner className="size-4" /> : <Icon.Exit className="size-4" />}
      <span className="sr-only">Sign out</span>
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { snapshot } = useGame();

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── header ── */}
      <header className="sticky top-0 z-50 border-b border-ink-600 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-4 px-4 sm:px-6">
          <Link
            href="/sanctum"
            className="shrink-0 text-[0.92rem] text-parchment transition-colors hover:text-gold"
          >
            <Wordmark />
            <span className="sr-only">AetherQuest home</span>
          </Link>

          {/* desktop navigation */}
          <nav aria-label="Primary" className="ml-4 hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map(({ href, label, icon: Glyph }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2 rounded-t border-b-2 px-3 py-2 font-display text-xs tracking-[0.15em] uppercase transition-colors ${
                        active
                          ? "border-gold text-gold"
                          : "border-transparent text-parchment-faint hover:text-parchment"
                      }`}
                    >
                      <Glyph className="size-4" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {/* purse */}
            <p className="flex items-center gap-1.5" title="Gold in your purse">
              <Icon.Coin className="size-4 text-gold" />
              <span className="numeral font-display text-sm text-gold">
                {formatNumber(snapshot.character.gold)}
              </span>
              <span className="sr-only">gold</span>
            </p>

            {/* streak */}
            <p
              className="hidden items-center gap-1.5 sm:flex"
              title="Current streak"
            >
              <Icon.Flame
                className={`size-4 ${
                  snapshot.character.streak > 0
                    ? "text-seal-bright"
                    : "text-ink-400"
                }`}
              />
              <span className="numeral font-display text-sm text-parchment-dim">
                {snapshot.character.streak}
              </span>
              <span className="sr-only">day streak</span>
            </p>

            {/* level */}
            <p className="flex items-center gap-1.5" title="Character level">
              <span className="eyebrow hidden text-[0.6rem] sm:inline">Lv</span>
              <span className="numeral font-display text-sm text-parchment">
                {snapshot.character.level}
              </span>
            </p>

            <SignOut />
          </div>
        </div>
        <ConnectionBanner />
      </header>

      {/* ── content ── */}
      <main
        id="main"
        className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-8"
      >
        {children}
      </main>

      {/* ── mobile tab bar ── */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-600 bg-ink-950/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-md">
          {NAV.map(({ href, label, icon: Glyph }) => {
            const active = pathname === href;
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 font-display text-[0.6rem] tracking-[0.16em] uppercase transition-colors ${
                    active ? "text-gold" : "text-parchment-faint"
                  }`}
                >
                  <Glyph className="size-5" />
                  {label}
                  <span
                    aria-hidden="true"
                    className={`h-px w-6 transition-colors ${
                      active ? "bg-gold" : "bg-transparent"
                    }`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <SparkLayer />
      <LevelUpRite />
      <Toasts />
    </div>
  );
}
