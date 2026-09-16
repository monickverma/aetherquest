# AetherQuest

**Keep your days like a grimoire.** AetherQuest is a dark-fantasy life RPG: you write habits down as quests, seal them when they are done, and a character grows from it — levels, five attributes, a daily streak, gold, and a vault of collectables to spend it on.

It is a full-stack app. Every number the player sees is computed and stored on the server, so progress survives a refresh, follows you across devices, and cannot be edited into existence from the browser.

> **Live:** _add your Vercel URL here after deploying_ · **Demo video:** _add link_

---

## Contents

- [Features](#features)
- [How the game works](#how-the-game-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Deploying to Vercel](#deploying-to-vercel)
- [Architecture](#architecture)
- [Security model](#security-model)
- [Robustness and edge cases](#robustness-and-edge-cases)
- [Accessibility](#accessibility)
- [Testing](#testing)
- [Project structure](#project-structure)

---

## Features

**Authentication**
- Email + passphrase sign-up and sign-in, bcrypt-hashed (cost 12).
- Sessions are signed JWTs in an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie, valid for 30 days.
- Protected pages redirect to sign-in and return you where you were going, with the return path validated against open redirects.
- Every API route re-verifies the session **and** re-reads the user row, so a deleted account cannot keep acting on a still-valid cookie.

**Quests (full CRUD)**
- Create, edit, delete, complete, and undo quests.
- Each quest trains one of five **attributes** and has one of five **difficulties** that decide its reward.
- **Daily** quests reset at midnight in *your* timezone; **one-time** quests stay done.
- New accounts start with four example quests, so the first screen is never empty.
- Filter the log by attribute; completed quests collapse into a "Sealed today" section.

**Progression**
- **Non-linear levels:** each level costs `round(60 × level^1.35) + 40` XP — level 10 costs nearly 14× what level 1 did.
- **Five attributes** (Might, Intellect, Discipline, Vitality, Spirit), each with its own rank curve and titles from *Novice* to *Mythic*.
- **Streaks** count consecutive days with at least one completion, in the player's own timezone. Each streak day adds **+2% to every reward**, capped at +60% (30 days).
- A **level-up rite**: a full-screen ceremony with a stamped medallion and rising embers. Rank-ups get their own.

**Economy — the Vault**
- Every quest pays **gold** alongside XP.
- **18 items** across three shelves: **sigils** (a crest for your medallion), **titles** (a line under your name), and **relics** (trophies).
- Four rarities, prices from 60 to 2,600 gold, with higher tiers sealed behind level requirements.
- Buy, wear, and remove; what you wear shows on your character sheet immediately.

**History — the Codex of Deeds**
- A permanent, paginated ledger of every completion with the XP, gold, and streak bonus it paid.
- Lifetime totals, days recorded, your busiest day, and where your effort went by attribute.
- Deeds keep a snapshot of the quest's title, so history survives renaming or deleting the quest.

**Feel**
- Optimistic UI: XP, gold, streak, and bars update the instant you press *Seal*, before the request returns.
- A gold ember burst and floating "+51 XP" rise from the button you pressed.
- Shaped loading skeletons for every page, spring-based transitions, and a live 14-day activity ribbon.
- An offline banner, automatic re-sync on reconnect, and a refresh when you return to a long-idle tab.

---

## How the game works

| Difficulty | Base XP | Base gold |
| ---------- | ------: | --------: |
| I · Trivial | 10 | 4 |
| II · Easy | 25 | 10 |
| III · Standard | 50 | 22 |
| IV · Hard | 100 | 50 |
| V · Epic | 200 | 110 |

**Award** = base × streak multiplier, where the multiplier is `1 + min(streak, 30) × 0.02`. The streak used is the one *this* completion produces, so the first deed of a new streak already earns +2%.

| From level | XP to advance |
| ---------: | ------------: |
| 1 | 100 |
| 2 | 193 |
| 5 | 567 |
| 10 | 1,383 |
| 20 | 3,464 |

Level is **never stored**. It is derived from total XP every time, so the two cannot drift apart. The same pure functions in [`src/lib/game.ts`](src/lib/game.ts) run on the server (to pay) and in the browser (to predict), which is why the optimistic update always matches what the server returns.

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router, React 19, TypeScript) | Server components give real data on first paint; route handlers give a JSON API in the same deploy |
| Styling | **Tailwind CSS v4** + a hand-built design system | Theme tokens in `@theme`; custom SVG glyphs instead of emoji or an icon set |
| Motion | **Motion** (Framer Motion) | Springs, layout animations, exit transitions |
| Database | **SQLite / libSQL** via **Drizzle ORM** | A plain file locally with zero setup; Turso in production with no code change |
| Auth | Custom — **jose** (JWT) + **bcryptjs** | Small, auditable, no third-party session store |
| Validation | **Zod** | Every request body is parsed and length-capped before touching the database |
| Fonts | Cinzel · EB Garamond · IM Fell English | Via `next/font` — self-hosted, no layout shift |

---

## Getting started

**Requirements:** Node.js **20.12+** (22 recommended) and npm.

```bash
git clone https://github.com/monickverma/aetherquest.git
cd aetherquest
npm install
cp .env.example .env.local        # then set AUTH_SECRET (see below)
npm run setup                     # creates the tables and stocks the Vault
npm run dev
```

Open <http://localhost:3000> and create a character.

`npm run setup` creates `data/aetherquest.db`, a local SQLite file. There is no database server to install. Delete the file and run setup again for a clean slate.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run typecheck` | TypeScript, no emit |
| `npm run setup` | `db:push` + `db:seed` |
| `npm run db:push` | Sync the schema in `src/db/schema.ts` to the database |
| `npm run db:seed` | Upsert the Vault catalogue (idempotent, safe in production) |
| `npm run db:studio` | Browse the database in Drizzle Studio |
| `npm run test:api` | Run the 82-check API test suite against a running dev server |

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | `file:./data/aetherquest.db` locally; `libsql://<db>.turso.io` in production |
| `DATABASE_AUTH_TOKEN` | production | Turso auth token. Leave empty for a local file |
| `AUTH_SECRET` | yes | Signs session cookies. **At least 32 characters.** Generate with `openssl rand -base64 48` |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical origin for SEO metadata, e.g. `https://aetherquest.vercel.app` |

`TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are accepted in place of the two `DATABASE_*` variables. Those are the names Vercel's Turso integration sets automatically.

---

## Deploying to Vercel

Production needs a hosted database, because serverless filesystems don't persist. AetherQuest uses **Turso** (hosted libSQL, generous free tier).

1. **Import the repository** at [vercel.com/new](https://vercel.com/new). The framework is detected automatically.
2. **Add a database:** in the project, open **Storage → Create Database → Turso** and connect it to the project. This sets `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
   *Alternatively*, create one with the Turso CLI (`turso db create aetherquest`, `turso db show --url aetherquest`, `turso db tokens create aetherquest`) and set `DATABASE_URL` / `DATABASE_AUTH_TOKEN` yourself.
3. **Add `AUTH_SECRET`** under **Settings → Environment Variables** (`openssl rand -base64 48`).
4. Optionally set `NEXT_PUBLIC_SITE_URL` to your production URL.
5. **Deploy.**

The `vercel-build` script runs automatically and:

1. **checks the environment:** it fails the build with instructions if there is no remote database or `AUTH_SECRET`, rather than shipping a site that errors on every request;
2. **syncs the schema** to Turso (`drizzle-kit push`);
3. **seeds the Vault** (idempotent);
4. runs `next build`.

So the first deploy creates its own tables, and every later deploy keeps the catalogue in step with the code.

---

## Architecture

```
Browser ──────────────────────────────────────────────────────────────┐
  GameProvider  (confirmed snapshot + pending ops, serial request queue)│
      │  names a quest — never sends an amount                          │
      ▼                                                                 │
proxy.ts  ── verifies the JWT, redirects signed-out visitors            │
      ▼                                                                 │
Route handlers  /api/*  ── requireUser() → Zod → mutations.ts           │
      │                                                                 │
      ▼                                                                 │
lib/game.ts  (pure progression maths, shared with the browser) ◄────────┘
      ▼
Drizzle ORM ── libSQL (SQLite file locally · Turso in production)
```

**Data model** ([`src/db/schema.ts`](src/db/schema.ts))

| Table | Holds |
| --- | --- |
| `users` | credentials, display name, IANA timezone |
| `characters` | total XP, gold, current and longest streak, last active day, equipped title and sigil |
| `attributes` | one row per character × attribute, holding that attribute's XP |
| `quests` | title, notes, attribute, difficulty, cadence, completion state |
| `deeds` | append-only completion ledger with snapshotted title and the exact award paid |
| `items` | the Vault catalogue (seeded) |
| `inventory` | what each user owns, and what they paid |

**The snapshot.** Every mutation returns one fully-computed payload (character, attributes, quests, 14-day activity, totals). The browser renders it and never recomputes levels from raw XP.

**Optimistic updates without races.** The UI shows `pendingOps.reduce(apply, confirmedSnapshot)`. Each optimistic operation is idempotent, so a server snapshot that already contains it is not counted twice. Requests go through a serial queue, so an older response can never overwrite a newer one, and a failure rolls back that single operation and nothing else. You can seal three quests as fast as you can click.

---

## Security model

The client names a quest; the server decides what it's worth.

- **No client-supplied amounts.** `POST /api/quests/:id/complete` ignores its body. XP and gold come from the difficulty stored on the quest row and the server-side streak.
- **Atomic completion.** The "not already done today" check is a conditional `UPDATE … WHERE … RETURNING` inside a transaction. Eight parallel completion requests produce exactly **one** award (see the test suite).
- **Atomic purchases.** The gold debit is `UPDATE … SET gold = gold - price WHERE gold >= price`, so two simultaneous purchases cannot spend the same coins.
- **Ownership on every query.** Quest, deed, and inventory queries are scoped by `user_id`. Touching another player's quest returns `404`, which doesn't even confirm it exists.
- **No account enumeration.** A wrong password and an unknown email return the same message and take the same time, because unknown emails are still compared against a real bcrypt hash.
- **Validated input.** Zod schemas with length caps on every body; unknown fields are stripped.
- **Rate limiting** on sign-in (10 per 10 minutes per IP) and sign-up (8 per 10 minutes).
  *Caveat:* the limiter is in-memory and per instance. On a multi-instance deployment it slows attackers down but isn't a hard guarantee; a shared store such as Redis would make it one.
- **Headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a strict `Referrer-Policy`, and a restrictive `Permissions-Policy`.

---

## Robustness and edge cases

| Situation | Behaviour |
| --- | --- |
| Empty or whitespace-only quest | Rejected in the browser with focus moved to the field, and again by the server (`422`, readable message) |
| Connection drops | An offline banner appears; actions are refused with a clear message and optimistic changes roll back. On reconnect the log re-syncs |
| Server error mid-action | The optimistic change is reverted and a toast explains; nothing is left half-applied |
| Double-click or two tabs | Only one completion is recorded; the other gets a polite "already done today" |
| Undo after spending the gold | XP and gold are reclaimed but gold is clamped at zero, so a balance never goes negative |
| Undoing the only deed of the day | The streak is rolled back too |
| Returning after midnight | Daily quests reopen in your own timezone; a lapsed streak reads 0 |
| Quest deleted | Its deeds stay in the Codex under the title they had when completed |
| Invalid timezone sent at sign-up | Falls back to UTC |
| Expired or tampered session | Treated as signed out |
| Render error | Caught by an in-shell error boundary with *Try again*, so navigation still works |
| Unknown URL | A themed 404 |

---

## Accessibility

- Semantic landmarks (`header`, `nav`, `main`, `aside`), one `h1` per page, and a logical heading order.
- A **skip link** as the first tab stop on every page.
- Every control is a native `<button>` or `<a>`, so everything works with **Tab, Enter, and Space**. Each quest's buttons have unique labels, e.g. *"Seal 'Read 20 pages' for 51 XP and 22 gold"*.
- The Vault shelves are a real **ARIA tablist** with arrow, Home, and End keys and roving tabindex.
- The level-up rite is an `alertdialog` that takes focus and closes on **Escape**.
- Form errors use `aria-invalid` and `aria-describedby`, and focus moves to the first invalid field.
- Progress bars are `role="progressbar"` with values and descriptive labels.
- Toasts and rewards are announced through `aria-live` regions.
- A visible gold focus ring everywhere; body text contrast is about 15:1.
- **`prefers-reduced-motion`** removes movement but keeps every state change; `forced-colors` mode is respected.
- Responsive from 320px phones to wide desktops, with a bottom tab bar on mobile and safe-area insets.

## Performance and SEO

- The landing page is **fully static**: prerendered at build time, with no cookies read.
- Signed-in pages are server-rendered with real data, so there's no empty flash followed by a spinner.
- Fonts are self-hosted through `next/font` with `display: swap`.
- The icons and textures are inline SVG, so there are no image requests for chrome.
- Metadata includes a title template, description, canonical URL, Open Graph and Twitter cards, a generated OG image, JSON-LD `WebApplication` data, `robots.txt`, `sitemap.xml`, and a web manifest. Private pages are marked `noindex`.

---

## Testing

`scripts/api-test.sh` runs **82 adversarial checks** against a running dev server:

- registration and login validation, duplicate emails, and no account enumeration;
- tampered, forged (`alg: none`), and missing session tokens;
- quest CRUD, empty and oversized input, and injected `xp`/`gold` fields being ignored;
- the exact award maths, level-ups, attribute XP, and same-day repeat completion;
- **8 parallel completions → exactly 1 award**;
- undo, including exact XP reversal;
- **cross-user isolation:** user B cannot read, edit, delete, complete, or undo user A's data;
- the Vault: insufficient gold, level locks, double purchase, wrong equip slot, and equip/unequip;
- page protection, open-redirect sanitising, and rate limiting.

```bash
npm run dev          # terminal 1
npm run test:api     # terminal 2  →  RESULT: 82 passed, 0 failed
```

The suite uses a local file database, because one fixture grants gold directly in `data/aetherquest.db`.

---

## Project structure

```
src/
├── app/
│   ├── (app)/                 signed-in shell: sanctum, codex, vault (+ loading, error)
│   ├── api/                   route handlers: auth, quests, codex, vault, character
│   ├── enter/ · enlist/       sign in · sign up
│   ├── page.tsx               static landing page
│   ├── globals.css            the design system
│   └── robots.ts · sitemap.ts · manifest.ts · opengraph-image.tsx · icon.svg
├── components/                GameProvider, QuestLog/Card/Composer, CharacterSheet,
│                              LevelUpRite, SparkLayer, Vault, Codex, glyphs, ui
├── db/                        schema + lazy libSQL client
├── lib/
│   ├── game.ts                the progression engine (pure, shared)
│   ├── mutations.ts           all state changes, transactional
│   ├── queries.ts             snapshot, codex, and vault reads
│   ├── auth.ts · session.ts   JWT + bcrypt
│   ├── validation.ts          Zod schemas
│   └── time.ts                timezone-aware day keys
└── proxy.ts                   route protection
scripts/
├── seed.ts                    Vault catalogue (idempotent upsert)
├── check-env.ts               pre-deploy configuration guard
└── api-test.sh                the API test suite
```

**Known dev-only advisory:** `npm audit` reports a moderate `esbuild` advisory inside `drizzle-kit`. That package is a development CLI used only for schema pushes; it isn't part of the application bundle, and the fix requires a breaking downgrade.
