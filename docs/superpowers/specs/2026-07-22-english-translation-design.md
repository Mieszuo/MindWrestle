# English Translation — Design

**Date:** 2026-07-22
**Branch:** `i18n-english-translation` (off `game-consistency-fixes`)
**Status:** Approved design, ready for implementation planning

## Goal

Add a complete English translation for the whole player-facing game. The app is
currently written in Polish (UI chrome, game content, and DB-seeded level
content). A locale system already exists and dynamic AI content is already
localized — this work fills the remaining gap: **all static text**.

## Current state

- `lib/i18n/locale.ts` already defines `Locale = "pl" | "en"`, cookie-based
  detection (`mindwrestle_locale`), geo/accept-language fallback, profile
  storage, and middleware that sets the cookie.
- Dynamic AI content (character replies, narration) is **already localized** via
  `localePromptInstruction(locale)` in `lib/ai/prompts.ts` and
  `lib/ai/psych-prompts.ts`.
- A language selector already exists in `components/game/player-panel.tsx`
  (saves locale to profile + cookie).
- **Gap:** static text is hardcoded Polish (~1241 lines across ~118 files) in
  three sources:
  1. **Code UI chrome** — `app/` pages + `components/` (~44 files): JSX labels,
     buttons, headings.
  2. **Code game content** — `lib/game/*` (~71 files): defeat copy, greetings,
     narration, chronicle, coaching hints, mock-levels, level-scenes.
  3. **Database game content** — `game_levels` rows seeded via SQL migrations:
     titles, character names, archetypes, objective hints, backstories.

## Scope

**In scope:** everything a player touches — game UI, level/character content,
greetings, defeat/victory copy, epilogue, intro, landing, auth, billing, and
transactional emails (auth confirm-signup).

**Out of scope:** admin panel UI (`app/admin/*`, `components/admin/*`), dev docs
/ README.

## Architecture (approach A: custom typed dictionary)

Chosen over next-intl (its `[locale]`-routing/middleware idioms fight the
existing cookie/geo resolver, and AGENTS.md warns this Next.js diverges from
upstream) and over inline `pick()` at each call site (scatters ~1200 bilingual
literals, no central review surface).

### 1. Message catalog — PL is source of truth

- `lib/i18n/messages/pl.ts` — canonical dictionary. `export type Messages = typeof pl`.
- `lib/i18n/messages/en.ts` — `const en: Messages = { … }`, so **any missing or
  misspelled key is a compile error**.
- Nested namespaces by feature: `common`, `landing`, `auth`, `intro`, `levels`,
  `level` (conversation view), `chronicle`, `epilog`, `defeat`, `victory`,
  `playerPanel`, `billing`, plus a `content` namespace for `lib/game` copy.
- **Interpolation:** parameterized entries are functions, e.g.
  `levelBadge: (n: number) => \`Poziom ${n}\``. Type-safe params, no runtime
  `{placeholder}` parsing needed.

### 2. Resolution helpers

- **Server components:** `getServerLocale()` reads the cookie via `next/headers`
  `cookies()`, falling back to `detectRequestLocale(headers)`. `getDictionary(locale)`
  returns the `Messages` object. Server pages call these directly.
- **Client components:** `<LocaleProvider locale={locale} messages={dict}>` in
  the root `app/layout.tsx`. The server resolves the locale and passes the
  **already-selected** dictionary as a prop, so only the active language ships
  to the client bundle. Provider exposes `useT()` and `useLocale()` hooks.

### 3. `lib/game` content

The user-facing constants (`defeat-copy`, `conversation-greetings`,
`coaching-hints`, `cinematic-narration`, `lore/chronicle-entries`, `mock-levels`,
`level-scenes`, defeat/victory copy, and any other Polish literals in
`lib/game/*`) move their strings into the `content` namespace of the catalog.
The functions gain a `locale: Locale` parameter and read from
`getDictionary(locale)`. This centralizes all translation in one reviewable
place. These run server-side (or accept locale threaded from callers), so
`getDictionary` is always available.

### 4. Database game content — localized JSONB

- New migration adds an `i18n jsonb` column to `game_levels`, shaped:
  ```json
  {
    "en": { "title": "...", "character_name": "...", "archetype": "...",
            "objective_hint": "...", "publicDescription": "...", "backstory": "..." },
    "pl": { ... }
  }
  ```
  Existing Polish columns remain as the source/fallback.
- Engine mappers (`objectiveFromRow` and character mapping in
  `lib/game/levels-client.ts`) read `row.i18n?.[locale]?.field ?? row.field`.
  Character-config JSONB fields (`publicDescription`, backstory) resolve the
  same way.
- A backfill migration populates `i18n.en` with English translations for every
  seeded level. Polish stays as-is in the base columns.

### 5. Emails

Only `supabase/email-templates/confirm-signup.html` + `.subject.txt` exist.
Supabase sends one server-side template with no clean per-user-locale selection,
so make it **bilingual**: English block first, Polish block second — including
the subject line.

### 6. Language-switch UX

The selector in `player-panel.tsx` already saves locale to profile + cookie. Add
a `router.refresh()` after a successful save so server-rendered static text
re-renders in the newly chosen language. Replace the hardcoded Polish status
strings in that component (`"Zapisywanie języka..."`, etc.) with catalog keys.

## Testing

- **Compile-time:** `en` must satisfy `Messages` (structural check via `const en: Messages`).
- **Unit:** recursive key-set diff asserting `pl` and `en` have **identical
  key paths** (catches gaps that typing alone can miss, e.g. optional keys).
- **Unit:** `lib/game` content functions return the correct language for a given
  locale.
- **Unit:** engine DB-i18n fallback — `row.i18n?.en` used when present, base
  Polish column used when absent.

## Rollout order (single branch)

1. Infra: catalog skeleton (`pl.ts`/`en.ts` types), `getDictionary`,
   `getServerLocale`, `LocaleProvider` + hooks, wire into root layout.
2. UI chrome namespaces — extract `app/` pages + `components/` (player-facing).
3. `lib/game` content → `content` namespace + locale params.
4. DB migration (add `i18n` column) + backfill migration (English content).
5. Emails — bilingual confirm-signup.
6. Switch UX (`router.refresh()`) + all tests.

## Non-goals / risks

- **Admin & docs** stay Polish (out of scope).
- **Translation quality:** English copy for narrative/game content should read
  naturally, not machine-literal — this is content work, not just mechanical
  key extraction. Budget review time for the `content` namespace and DB backfill.
- **Bundle:** only the active locale's dictionary reaches the client (passed as
  a prop), so shipping both languages is not a concern.
