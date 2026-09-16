import type { SVGProps } from "react";

import type { AttributeKey } from "@/lib/game";

/**
 * Every mark in the interface is drawn here.
 *
 * No emoji anywhere: emoji render in each platform's own house style, which
 * would drop a piece of someone else's design language into the middle of
 * this one. These are plain strokes that inherit `currentColor`, so a glyph
 * is always exactly the colour of the text it sits beside.
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* ═══ attribute marks ═══════════════════════════════════════════ */

const ATTRIBUTE_PATHS: Record<AttributeKey, React.ReactNode> = {
  // A blade stood on its point: Might is collected, not given.
  might: (
    <>
      <path d="M12 2.5 9.6 6 M12 2.5 14.4 6" />
      <path d="M12 2.5V15" />
      <path d="M8.2 15h7.6" />
      <path d="M12 15v5.2" />
      <path d="M10 20.8h4" />
    </>
  ),
  // An open codex, spine down the middle.
  intellect: (
    <>
      <path d="M12 6.6C10 5 7.2 4.4 4 4.8v13.1c3.2-.4 6 .2 8 1.9" />
      <path d="M12 6.6c2-1.6 4.8-2.2 8-1.8v13.1c-3.2-.4-6 .2-8 1.9" />
      <path d="M12 6.6v13.2" />
    </>
  ),
  // The hourglass: order is a thing you keep turning over.
  discipline: (
    <>
      <path d="M6.5 3h11M6.5 21h11" />
      <path d="M7.6 3c0 5 4.4 7.3 4.4 9s-4.4 4-4.4 9" />
      <path d="M16.4 3c0 5-4.4 7.3-4.4 9s4.4 4 4.4 9" />
      <path d="M9.4 18.2h5.2" />
    </>
  ),
  // A sprig: two leaves off one stem.
  vitality: (
    <>
      <path d="M12 21V7.4" />
      <path d="M12 13.4c-.2-2.6-1.9-4.8-5-5.2-.5 3.4 1.8 5.4 5 5.2Z" />
      <path d="M12 10.2c.2-2.6 1.9-4.8 5-5.2.5 3.4-1.8 5.4-5 5.2Z" />
      <path d="M9.4 21h5.2" />
    </>
  ),
  // A flame with an inner flame: the part of you that is tended.
  spirit: (
    <>
      <path d="M10.6 2.8C10.2 9 5.8 10.8 5.8 15.1 5.8 18.4 8.6 21 12 21s6.2-2.6 6.2-5.9c0-5.5-4.2-8.9-7.6-12.3Z" />
      <path d="M12 21c-1.7 0-2.9-1.2-2.9-2.7 0-2 1.9-2.8 2.3-5.4 1.7 1.4 3.5 3.1 3.5 5.4 0 1.5-1.2 2.7-2.9 2.7Z" />
    </>
  ),
};

export function AttributeGlyph({
  attribute,
  ...props
}: IconProps & { attribute: AttributeKey }) {
  return <Svg {...props}>{ATTRIBUTE_PATHS[attribute]}</Svg>;
}

/* ═══ sigils: the crest worn beside a name ══════════════════════ */

const SIGIL_PATHS: Record<string, React.ReactNode> = {
  ember: (
    <>
      <path d="M12 8.4c-2 1.8-3.2 3.3-3.2 5.2a3.2 3.2 0 0 0 6.4 0c0-1.9-1.2-3.4-3.2-5.2Z" />
      <path d="M12 3.2v2.4M5.6 5.9l1.7 1.7M18.4 5.9l-1.7 1.7M3.4 12.4h2.3M18.3 12.4h2.3M6.2 19.4l1.6-1.6M17.8 19.4l-1.6-1.6" />
    </>
  ),
  quill: (
    <>
      <path d="M4 20.5c6-1 9.5-3.4 12-7.3 2.2-3.4 3-6.9 3.2-9.7-3 .5-6.6 1.7-9.5 4.2C6.6 10.3 4.9 14.3 4 20.5Z" />
      <path d="M4 20.5 10.4 14" />
      <path d="M13.8 7.6c-1.4 2-2.4 4.3-3 6.6" />
    </>
  ),
  anvil: (
    <>
      <path d="M3.4 8.6h9.2c1.6 2.4 3.9 3.3 6.4 3.2v1.9c-3.4 0-5.5 1.4-6.4 3.3H7.9c.4-1.4.2-2.6-.9-3.4H4.6c-.9-1.2-1.4-2.9-1.2-5Z" />
      <path d="M8.6 17v3.4M15.4 20.4H6.1" />
      <path d="M8.2 8.6V5.4h5.2" />
    </>
  ),
  moth: (
    <>
      <path d="M12 8.2v9.4" />
      <path d="M10.2 6.6 8 3.6M13.8 6.6 16 3.6" />
      <path d="M12 8.6C10.4 5.8 6.6 5 4.4 6.9c-2 1.8-1.4 5.4.8 7 1.9 1.3 4.6 1.3 6.8-1.2Z" />
      <path d="M12 8.6c1.6-2.8 5.4-3.6 7.6-1.7 2 1.8 1.4 5.4-.8 7-1.9 1.3-4.6 1.3-6.8-1.2Z" />
      <path d="M12 13.4c-1.2 2.2-2.6 3.4-4.2 4.2 1.4 1.6 3 2.4 4.2 2.4s2.8-.8 4.2-2.4c-1.6-.8-3-2-4.2-4.2Z" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6 2.8h12M6 21.2h12" />
      <path d="M7.4 2.8c0 5.2 4.6 7.5 4.6 9.2s-4.6 4-4.6 9.2" />
      <path d="M16.6 2.8c0 5.2-4.6 7.5-4.6 9.2s4.6 4 4.6 9.2" />
      <path d="M9 18h6" />
      <path d="M12 12v4.4" />
    </>
  ),
  eclipse: (
    <>
      <circle cx="12" cy="12" r="6.2" />
      <path d="M8.6 6.9a6.2 6.2 0 0 0 0 10.2 6.2 6.2 0 0 1 0-10.2Z" fill="currentColor" />
      <path d="M12 2.2v1.8M12 20v1.8M2.2 12H4M20 12h1.8M5.1 5.1l1.3 1.3M17.6 17.6l1.3 1.3M18.9 5.1l-1.3 1.3M6.4 17.6l-1.3 1.3" />
    </>
  ),
  ouroboros: (
    <>
      <path d="M15.6 5.2A8 8 0 1 0 19.6 13" />
      <path d="M19.6 13c.5-2.1-.2-4-1.6-5.2" />
      <path d="m15.6 5.2 3.4 1.2-1.2 3.4" />
      <circle cx="17.2" cy="15.6" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  candle: (
    <>
      <path d="M12 3.2c-1 1.8-2.2 2.6-2.2 4.1a2.2 2.2 0 0 0 4.4 0c0-1.5-1.2-2.3-2.2-4.1Z" />
      <path d="M12 9.4v2" />
      <path d="M8.6 11.4h6.8v8.2H8.6z" />
      <path d="M7 19.6h10" />
    </>
  ),
  seal: (
    <>
      <path d="M12 3.4c4.2 0 7.6 3 7.6 6.9 0 2.6-1.3 4.2-2.4 6-1 1.6-1.1 3.2-1.1 4.3H7.9c0-1.1-.1-2.7-1.1-4.3-1.1-1.8-2.4-3.4-2.4-6 0-3.9 3.4-6.9 7.6-6.9Z" />
      <path d="m12 7.4 1.4 2.9 3.2.4-2.3 2.2.6 3.1-2.9-1.5-2.9 1.5.6-3.1-2.3-2.2 3.2-.4Z" />
    </>
  ),
  key: (
    <>
      <circle cx="7.4" cy="7.4" r="3.8" />
      <path d="m10.2 10.2 9 9" />
      <path d="m16.4 16.4-2 2M18.6 18.6l-2 2" />
    </>
  ),
  map: (
    <>
      <path d="m3.4 6.2 5.6-2.4v14l-5.6 2.4z" />
      <path d="m9 3.8 6 2.4v14l-6-2.4z" />
      <path d="m15 6.2 5.6-2.4v14L15 20.2z" />
      <path d="M12 9.4v1.4M17.4 12.6v1.4" />
    </>
  ),
};

export const SIGIL_NAMES = Object.keys(SIGIL_PATHS);

export function SigilGlyph({
  name,
  ...props
}: Omit<IconProps, "name"> & { name: string | null | undefined }) {
  const paths = name ? SIGIL_PATHS[name] : null;
  if (!paths) return <Svg {...props}>{SIGIL_PATHS.ember}</Svg>;
  return <Svg {...props}>{paths}</Svg>;
}

/* ═══ interface icons ═══════════════════════════════════════════ */

export const Icon = {
  Plus: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  Check: (p: IconProps) => (
    <Svg {...p}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  ),
  Close: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  ),
  Trash: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 6.5h16M9.5 6.5V4.2h5v2.3" />
      <path d="M6.4 6.5 7.3 20h9.4l.9-13.5" />
      <path d="M10.2 10v6M13.8 10v6" />
    </Svg>
  ),
  Quill: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 20.5c6-1 9.5-3.4 12-7.3 2.2-3.4 3-6.9 3.2-9.7-3 .5-6.6 1.7-9.5 4.2C6.6 10.3 4.9 14.3 4 20.5Z" />
      <path d="M4 20.5 10.4 14" />
    </Svg>
  ),
  Undo: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4.5 9.5h10a5 5 0 0 1 0 10h-6" />
      <path d="m8 5-3.5 4.5L8 14" />
    </Svg>
  ),
  Flame: (p: IconProps) => (
    <Svg {...p}>
      <path d="M10.6 2.8C10.2 9 5.8 10.8 5.8 15.1 5.8 18.4 8.6 21 12 21s6.2-2.6 6.2-5.9c0-5.5-4.2-8.9-7.6-12.3Z" />
      <path d="M12 21c-1.7 0-2.9-1.2-2.9-2.7 0-2 1.9-2.8 2.3-5.4 1.7 1.4 3.5 3.1 3.5 5.4 0 1.5-1.2 2.7-2.9 2.7Z" />
    </Svg>
  ),
  Coin: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="5.2" />
      <path d="M12 9.4v5.2M10.4 12h3.2" />
    </Svg>
  ),
  Scroll: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6.8 3.4h10.6a2 2 0 0 1 2 2v13.2a2 2 0 0 1-2 2H6.8" />
      <path d="M6.8 3.4a2 2 0 0 0-2 2v2.2h4v-2.2a2 2 0 0 0-2-2Z" />
      <path d="M6.8 20.6a2 2 0 0 0 2-2v-2.2h-4v2.2a2 2 0 0 0 2 2Z" />
      <path d="M11 8.4h5.2M11 12h5.2M11 15.6h3" />
    </Svg>
  ),
  Vault: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4.4 7.6 12 4l7.6 3.6v5.2c0 4.2-3.1 7.3-7.6 8.4-4.5-1.1-7.6-4.2-7.6-8.4Z" />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 6.8v2.6M12 14.6v2.6M8.8 12h-2M17.2 12h-2" />
    </Svg>
  ),
  Sanctum: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3.4 10.4 12 3.6l8.6 6.8" />
      <path d="M5.6 9v11.4h12.8V9" />
      <path d="M9.6 20.4v-6.2h4.8v6.2" />
    </Svg>
  ),
  Chevron: (p: IconProps) => (
    <Svg {...p}>
      <path d="m6 9.5 6 6 6-6" />
    </Svg>
  ),
  Exit: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14.5 4.5h3.2a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3.2" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </Svg>
  ),
  Spinner: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3.4a8.6 8.6 0 1 1-8.6 8.6" opacity={0.95} />
    </Svg>
  ),
  Warning: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3.6 21.2 19.6H2.8Z" />
      <path d="M12 9.6v4.8M12 17.2v.4" />
    </Svg>
  ),
};

/* ═══ ornament ══════════════════════════════════════════════════ */

/** A printer's fleuron, used to close a section the way a book would. */
export function Fleuron({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 2.2c-2.6 0-4.4 1.9-4.4 4.2 0 2 1.5 3.4 3.2 3.4 1.3 0 2.3-.9 2.3-2 0-.9-.6-1.6-1.5-1.6" />
      <path d="M22 2.2c2.6 0 4.4 1.9 4.4 4.2 0 2-1.5 3.4-3.2 3.4-1.3 0-2.3-.9-2.3-2 0-.9.6-1.6 1.5-1.6" />
      <path d="M16.4 7H4.6M27.6 7h11.8" />
      <path d="M2.4 7h.6M41 7h.6" />
    </svg>
  );
}

/** The wordmark: inscriptional caps with a hairline rule beneath. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-display tracking-[0.34em] uppercase leading-none ${className ?? ""}`}
    >
      Aether<span className="text-gold">quest</span>
    </span>
  );
}
