"use client";

import { forwardRef, useId } from "react";

import { Icon } from "./glyphs";

/* ── progress: the gold vein ───────────────────────────────── */

export function Vein({
  value,
  max,
  tone,
  className = "h-2",
  label,
}: {
  value: number;
  max: number;
  tone?: boolean;
  className?: string;
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 100;
  return (
    <div
      className={`vein ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label}
    >
      <div
        className={`vein__fill ${tone ? "vein__fill--tone" : ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ── fields ────────────────────────────────────────────────── */

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string | null;
};

export const TextField = forwardRef<HTMLInputElement, FieldProps>(
  function TextField({ label, hint, error, id, className, ...props }, ref) {
    const generated = useId();
    const fieldId = id ?? generated;
    const hintId = `${fieldId}-hint`;
    const errorId = `${fieldId}-error`;

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={fieldId}
          className="eyebrow block text-parchment-dim"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={`field ${className ?? ""}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          {...props}
        />
        {hint && !error ? (
          <p id={hintId} className="text-xs text-parchment-faint">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p
            id={errorId}
            className="flex items-start gap-1.5 text-xs text-seal-bright"
          >
            <Icon.Warning className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    );
  },
);

/* ── a pending indicator that reads as a turning quill ─────── */

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <Icon.Spinner
      className={`${className} animate-spin motion-reduce:animate-none`}
    />
  );
}

/* ── an empty state with the book's voice ──────────────────── */

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="plate plate--ruled flex flex-col items-center gap-3 px-6 py-12 text-center">
      <h3 className="font-display text-lg text-parchment">{title}</h3>
      <p className="scribe max-w-sm text-sm">{children}</p>
      {action}
    </div>
  );
}

/* ── loading skeletons, shaped like the thing they precede ─── */

export function QuestSkeleton() {
  return (
    <div className="plate flex items-center gap-4 p-4">
      <div className="skeleton size-11 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-3 w-1/3" />
      </div>
      <div className="skeleton h-9 w-24 rounded" />
    </div>
  );
}
