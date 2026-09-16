"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ApiError, api } from "@/lib/client";
import { Icon } from "./glyphs";
import { Spinner, TextField } from "./ui";

type Mode = "enter" | "enlist";

type Errors = Partial<Record<"displayName" | "email" | "password", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mirrors the server's rules so most mistakes are caught before a request is
 * sent. The server still validates everything — this is for speed, not trust.
 */
function validate(mode: Mode, values: Record<string, string>): Errors {
  const errors: Errors = {};

  if (mode === "enlist") {
    const name = values.displayName.trim();
    if (name.length < 2) errors.displayName = "Your name must be at least 2 characters.";
    else if (name.length > 40) errors.displayName = "Keep your name under 40 characters.";
  }

  const email = values.email.trim();
  if (!email) errors.email = "Enter your email address.";
  else if (!EMAIL_RE.test(email)) errors.email = "That does not look like an email address.";

  if (!values.password) errors.password = "Enter your passphrase.";
  else if (mode === "enlist" && values.password.length < 8) {
    errors.password = "Your passphrase must be at least 8 characters.";
  }

  return errors;
}

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isEnlist = mode === "enlist";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const found = validate(mode, { displayName, email, password });
    setErrors(found);

    // Send focus to the first problem, so keyboard and screen-reader users
    // land exactly where the fix is needed.
    if (found.displayName) return nameRef.current?.focus();
    if (found.email) return emailRef.current?.focus();
    if (found.password) return passwordRef.current?.focus();

    setBusy(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      await api(isEnlist ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        json: isEnlist
          ? { displayName: displayName.trim(), email: email.trim(), password, timezone }
          : { email: email.trim(), password, timezone },
      });
      router.replace(next);
      router.refresh();
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Try again in a moment.",
      );
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-sm border border-seal-bright/50 bg-seal/15 px-3.5 py-3 text-sm text-parchment"
        >
          <Icon.Warning className="mt-0.5 size-4 shrink-0 text-seal-bright" />
          <p>{formError}</p>
        </div>
      ) : null}

      {isEnlist ? (
        <TextField
          ref={nameRef}
          label="What shall we call you?"
          name="displayName"
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            if (errors.displayName) setErrors({ ...errors, displayName: undefined });
          }}
          maxLength={40}
          placeholder="Wren of the Long Road"
          error={errors.displayName}
          required
        />
      ) : null}

      <TextField
        ref={emailRef}
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errors.email) setErrors({ ...errors, email: undefined });
        }}
        placeholder="you@example.com"
        error={errors.email}
        required
      />

      <div className="relative">
        <TextField
          ref={passwordRef}
          label="Passphrase"
          name="password"
          type={reveal ? "text" : "password"}
          autoComplete={isEnlist ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          hint={isEnlist ? "At least 8 characters. Longer is stronger." : undefined}
          error={errors.password}
          className="!pr-16"
          required
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-pressed={reveal}
          className="absolute right-2 top-[1.95rem] rounded px-2 py-1.5 font-display text-[0.6rem] tracking-[0.14em] uppercase text-parchment-faint transition-colors hover:text-gold"
        >
          {reveal ? "Hide" : "Show"}
          <span className="sr-only"> passphrase</span>
        </button>
      </div>

      <button type="submit" disabled={busy} className="seal-btn w-full !py-3">
        {busy ? <Spinner className="size-4" /> : null}
        {busy
          ? isEnlist
            ? "Binding your name…"
            : "Opening the book…"
          : isEnlist
            ? "Begin the chronicle"
            : "Enter the sanctum"}
      </button>

      <p className="text-center text-sm text-parchment-faint">
        {isEnlist ? (
          <>
            Already have a character?{" "}
            <Link
              href={`/enter${next !== "/sanctum" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-gold underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold-bright"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href="/enlist"
              className="text-gold underline decoration-gold/40 underline-offset-4 transition-colors hover:text-gold-bright"
            >
              Create a character
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
