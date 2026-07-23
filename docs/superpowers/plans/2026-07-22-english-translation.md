# English Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete English translation for the whole player-facing game by extracting all hardcoded Polish static text into a typed message catalog resolved by the existing `Locale` system, plus localized DB game content.

**Architecture:** A custom typed dictionary (`lib/i18n/messages/pl.ts` is the source of truth; `en.ts` must satisfy `type Messages = typeof pl`, so missing keys are compile errors). Server components resolve the locale from the cookie and read `getDictionary(locale)`; client components read strings through a `LocaleProvider` + `useT()` hook fed the already-selected dictionary from the root layout. DB-seeded level content gains an `i18n` JSONB column with English alongside Polish.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Supabase (Postgres), Vitest, bun.

## Global Constraints

- **This Next.js diverges from upstream.** Before writing any code touching Next.js APIs (`cookies()`, layout, metadata), read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices (per AGENTS.md).
- **`cookies()` is async here** — `const cookieStore = await cookies();` (see `lib/supabase/server.ts:7`).
- **Package manager is bun.** The configured test runner is **vitest** — run tests with `bun run test` or `bunx vitest run <path>` (NOT `bun test`, which invokes Bun's native runner and ignores `vitest.config.ts` and the `@vitest-environment` pragma). Typecheck with `bunx tsc --noEmit`, build with `bun run build`.
- **Locale type** is `Locale = "pl" | "en"` from `lib/i18n/locale.ts`. Do not introduce a parallel locale enum.
- **PL is the source of truth.** English is a translation of existing Polish copy. Keep meaning and tone; do not invent new UX copy.
- **Scope:** player-facing only. Do NOT translate `app/admin/*`, `components/admin/*`, or dev docs/README.
- **Commit frequently** — one commit per task minimum. End commit messages with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## File Structure

**New files:**
- `lib/i18n/messages/pl.ts` — canonical dictionary + `export type Messages = typeof pl`.
- `lib/i18n/messages/en.ts` — `const en: Messages = { … }` (English).
- `lib/i18n/messages/index.ts` — `getDictionary(locale)`.
- `lib/i18n/server.ts` — `getServerLocale()` (server components).
- `lib/i18n/__tests__/messages-parity.test.ts` — key-set parity gate.
- `lib/i18n/__tests__/server.test.ts`, `lib/i18n/__tests__/get-dictionary.test.ts`.
- `components/i18n/locale-provider.tsx` — client context + `useT()`/`useLocale()`.
- `supabase/migrations/<ts>_game_levels_i18n_column.sql` — add `i18n` JSONB.
- `supabase/migrations/<ts>_game_levels_i18n_english_backfill.sql` — English content.

**Modified files** (grouped by task below): root layout, ~6 player-facing `app/` files, ~29 player-facing `components/` files, `lib/game/*` display-text files, `lib/game/levels-client.ts`, `lib/supabase/database.types.ts`, `supabase/email-templates/confirm-signup.html` + `.subject.txt`.

---

## Task 1: i18n message-catalog skeleton + parity gate

**Files:**
- Create: `lib/i18n/messages/pl.ts`
- Create: `lib/i18n/messages/en.ts`
- Create: `lib/i18n/messages/index.ts`
- Test: `lib/i18n/__tests__/messages-parity.test.ts`
- Test: `lib/i18n/__tests__/get-dictionary.test.ts`

**Interfaces:**
- Produces:
  - `export type Messages = typeof pl` (from `pl.ts`)
  - `export const pl: Messages` seed with a `common` namespace
  - `export const en: Messages`
  - `export function getDictionary(locale: Locale): Messages`
  - Helper `collectKeyPaths(obj): string[]` lives in the test file only.

- [ ] **Step 1: Write the parity + dictionary tests (failing)**

```ts
// lib/i18n/__tests__/messages-parity.test.ts
import { describe, expect, it } from "vitest";
import { pl } from "@/lib/i18n/messages/pl";
import { en } from "@/lib/i18n/messages/en";

function collectKeyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    collectKeyPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("message catalog parity", () => {
  it("pl and en have identical key paths", () => {
    const plKeys = collectKeyPaths(pl).sort();
    const enKeys = collectKeyPaths(en).sort();
    const missingInEn = plKeys.filter((k) => !enKeys.includes(k));
    const extraInEn = enKeys.filter((k) => !plKeys.includes(k));
    expect({ missingInEn, extraInEn }).toEqual({ missingInEn: [], extraInEn: [] });
  });
});
```

```ts
// lib/i18n/__tests__/get-dictionary.test.ts
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/messages";
import { pl } from "@/lib/i18n/messages/pl";
import { en } from "@/lib/i18n/messages/en";

describe("getDictionary", () => {
  it("returns pl for pl", () => expect(getDictionary("pl")).toBe(pl));
  it("returns en for en", () => expect(getDictionary("en")).toBe(en));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test lib/i18n/__tests__/`
Expected: FAIL — cannot resolve `@/lib/i18n/messages/pl`.

- [ ] **Step 3: Create the catalog skeleton**

```ts
// lib/i18n/messages/pl.ts
export const pl = {
  common: {
    close: "Zamknij",
    back: "Wróć",
    cancel: "Anuluj",
    loading: "Ładowanie...",
  },
} as const;

export type Messages = typeof pl;
```

```ts
// lib/i18n/messages/en.ts
import type { Messages } from "@/lib/i18n/messages/pl";

export const en: Messages = {
  common: {
    close: "Close",
    back: "Back",
    cancel: "Cancel",
    loading: "Loading...",
  },
};
```

```ts
// lib/i18n/messages/index.ts
import type { Locale } from "@/lib/i18n/locale";
import { pl, type Messages } from "@/lib/i18n/messages/pl";
import { en } from "@/lib/i18n/messages/en";

export type { Messages };
export { pl, en };

export function getDictionary(locale: Locale): Messages {
  return locale === "pl" ? pl : en;
}
```

> Note: `pl` uses `as const` so function-valued entries added later keep precise
> types. `en` is typed `Messages`, forcing structural parity at compile time.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test lib/i18n/__tests__/`
Expected: PASS (2 files).

- [ ] **Step 5: Typecheck**

Run: `bunx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/i18n/messages lib/i18n/__tests__
git commit -m "feat(i18n): typed message catalog skeleton with parity gate"
```

---

## Task 2: Server locale helper

**Files:**
- Create: `lib/i18n/server.ts`
- Test: `lib/i18n/__tests__/server.test.ts`

**Interfaces:**
- Consumes: `normalizeLocale`, `LOCALE_COOKIE_NAME`, `detectRequestLocale` from `lib/i18n/locale.ts`.
- Produces: `export async function getServerLocale(): Promise<Locale>`.

- [ ] **Step 1: Write the failing test**

`getServerLocale` reads `next/headers` `cookies()`/`headers()`, so the test mocks them.

```ts
// lib/i18n/__tests__/server.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
const headersGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
  headers: async () => ({ get: headersGet }),
}));

import { getServerLocale } from "@/lib/i18n/server";

afterEach(() => {
  cookieGet.mockReset();
  headersGet.mockReset();
});

describe("getServerLocale", () => {
  it("prefers the locale cookie", async () => {
    cookieGet.mockReturnValue({ value: "en" });
    expect(await getServerLocale()).toBe("en");
  });

  it("falls back to request detection when cookie missing", async () => {
    cookieGet.mockReturnValue(undefined);
    headersGet.mockImplementation((name: string) =>
      name === "accept-language" ? "pl-PL,pl;q=0.9" : null,
    );
    expect(await getServerLocale()).toBe("pl");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test lib/i18n/__tests__/server.test.ts`
Expected: FAIL — cannot resolve `@/lib/i18n/server`.

- [ ] **Step 3: Implement `getServerLocale`**

First read `node_modules/next/dist/docs/` for the current `cookies()`/`headers()`
API, then:

```ts
// lib/i18n/server.ts
import { cookies, headers } from "next/headers";
import {
  detectRequestLocale,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/locale";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  if (fromCookie) return fromCookie;
  return detectRequestLocale(await headers());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test lib/i18n/__tests__/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/server.ts lib/i18n/__tests__/server.test.ts
git commit -m "feat(i18n): getServerLocale cookie/header resolver"
```

---

## Task 3: Client LocaleProvider + hooks, wired into root layout

**Files:**
- Create: `components/i18n/locale-provider.tsx`
- Modify: `app/layout.tsx` (add provider + resolve locale, set `<html lang>`)
- Test: `components/i18n/__tests__/locale-provider.test.tsx`

**Interfaces:**
- Consumes: `getServerLocale` (Task 2), `getDictionary`/`Messages` (Task 1).
- Produces:
  - `export function LocaleProvider(props: { locale: Locale; messages: Messages; children: React.ReactNode })`
  - `export function useT(): Messages`
  - `export function useLocale(): Locale`

- [ ] **Step 1: Write the failing test**

vitest env is `node`; add a jsdom-based test. Confirm `jsdom` availability first:
`bunx vitest run --environment jsdom components/i18n` — if jsdom is missing,
install it: `bun add -d jsdom`, then set `// @vitest-environment jsdom` at the
top of the test file.

```tsx
// components/i18n/__tests__/locale-provider.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider, useT, useLocale } from "@/components/i18n/locale-provider";
import { getDictionary } from "@/lib/i18n/messages";

function Probe() {
  const t = useT();
  return <span>{useLocale()}:{t.common.close}</span>;
}

describe("LocaleProvider", () => {
  it("exposes locale + dictionary to consumers", () => {
    render(
      <LocaleProvider locale="en" messages={getDictionary("en")}>
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByText("en:Close")).toBeDefined();
  });
});
```

> If `@testing-library/react` is not installed, add it:
> `bun add -d @testing-library/react @testing-library/dom`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run components/i18n`
Expected: FAIL — cannot resolve `@/components/i18n/locale-provider`.

- [ ] **Step 3: Implement the provider**

```tsx
// components/i18n/locale-provider.tsx
"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n/locale";
import type { Messages } from "@/lib/i18n/messages";

const LocaleContext = createContext<{ locale: Locale; messages: Messages } | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, messages }}>
      {children}
    </LocaleContext.Provider>
  );
}

function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT/useLocale must be used within a LocaleProvider");
  return ctx;
}

export function useT(): Messages {
  return useLocaleContext().messages;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run components/i18n`
Expected: PASS.

- [ ] **Step 5: Wire the provider into the root layout**

Make `RootLayout` async, resolve the locale, set `<html lang>`, and wrap children.
Read `node_modules/next/dist/docs/` for the current async-layout/metadata rules first.

```tsx
// app/layout.tsx — changes only
import { getServerLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/messages";
import { LocaleProvider } from "@/components/i18n/locale-provider";

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  const messages = getDictionary(locale);

  return (
    <html
      lang={locale}
      className={`${ebGaramond.variable} ${cinzel.variable} ${cinzelDecorative.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#140c07]">
        <LocaleProvider locale={locale} messages={messages}>
          <AudioProvider>{children}</AudioProvider>
        </LocaleProvider>
        {/* existing scroll <script> unchanged */}
      </body>
    </html>
  );
}
```

Also localize the static `metadata.description` — move `"Gra, w ktorej wygrywasz rozmowa."` and `title` handling: keep `title: "MindWrestle"`, and set `description` from `getDictionary(await getServerLocale()).common.appDescription` via `generateMetadata`. Add `common.appDescription` to both `pl.ts` (`"Gra, w której wygrywasz rozmową."`) and `en.ts` (`"A game you win by talking."`), keeping the parity test green.

```tsx
// app/layout.tsx — replace the static `metadata` export
export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getServerLocale());
  return { title: "MindWrestle", description: t.common.appDescription };
}
```

- [ ] **Step 6: Run full test + build**

Run: `bun test` then `bun run build`
Expected: all pass; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add components/i18n app/layout.tsx lib/i18n/messages
git commit -m "feat(i18n): LocaleProvider + hooks wired into root layout"
```

---

## Extraction procedure (applies to Tasks 4–10)

Each extraction task follows the same loop. Do this per task so a reviewer can
gate each namespace independently:

1. **Add keys** to `lib/i18n/messages/pl.ts` under the task's namespace, copying
   the exact Polish strings verbatim from the source files. Parameterized strings
   become functions, e.g. `sealLabel: (n: number) => \`Pieczęć ${n}\``.
2. **Add the English translations** to `en.ts` at the same key paths. Translate
   for meaning and tone (see Global Constraints).
3. **Replace call sites** in the task's files:
   - Client components: `const t = useT();` then `t.<namespace>.<key>`.
   - Server components: `const t = getDictionary(await getServerLocale());`.
   - Preserve `aria-label`, `alt`, `title` attributes — translate those too.
4. **Run the parity test** — it must stay green (`bun test lib/i18n`).
5. **Typecheck + targeted build**: `bunx tsc --noEmit`.
6. **Commit** with `feat(i18n): translate <namespace>`.

**Worked example** (`components/game/PendingActionModal.tsx`):

```tsx
// before
<button>Wycofaj się</button>
<button>Rzucaj Kością</button>

// pl.ts
pendingAction: { withdraw: "Wycofaj się", rollDice: "Rzucaj Kością" },
// en.ts
pendingAction: { withdraw: "Withdraw", rollDice: "Roll the Dice" },

// after
const t = useT();
<button>{t.pendingAction.withdraw}</button>
<button>{t.pendingAction.rollDice}</button>
```

**Coverage check for every extraction task:** after replacing call sites, run
`grep -nE "[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]" <files in this task>` and confirm the only
remaining matches are Polish *comments* or non-display identifiers — no
user-facing literal should remain.

---

## Task 4: Landing namespace

**Files (Modify):**
- `components/landing/character-carousel.tsx`
- `components/landing/gameplay-preview.tsx`
- `components/landing/how-it-works.tsx`
- `components/landing/landing-cta.tsx`
- `components/landing/landing-hero.tsx`
- `lib/i18n/messages/pl.ts`, `en.ts` (add `landing` namespace)

- [ ] **Step 1** Add `landing` keys to `pl.ts` (verbatim Polish from the 5 files above).
- [ ] **Step 2** Add matching `landing` keys to `en.ts`.
- [ ] **Step 3** Replace call sites via `useT()` (all 5 are client components).
- [ ] **Step 4** `bun test lib/i18n` — parity green.
- [ ] **Step 5** Coverage grep on the 5 files (only comments may remain).
- [ ] **Step 6** `bunx tsc --noEmit`.
- [ ] **Step 7** Commit: `feat(i18n): translate landing`.

---

## Task 5: Auth namespace

**Files (Modify):**
- `app/login/page.tsx`
- `app/auth/confirmed/page.tsx`
- `components/auth/auth-confirmed-page.tsx`
- `components/auth/auth-form.tsx`
- `components/auth/auth-page.tsx`
- `lib/i18n/messages/pl.ts`, `en.ts` (add `auth` namespace)

- [ ] **Step 1** Add `auth` keys to `pl.ts` verbatim.
- [ ] **Step 2** Add English `auth` keys to `en.ts`.
- [ ] **Step 3** Replace call sites. `app/login/page.tsx` and `app/auth/confirmed/page.tsx` — check `"use client"`; if server, use `getDictionary(await getServerLocale())`; if client, `useT()`. `components/auth/*` are client → `useT()`.
- [ ] **Step 4** `bun test lib/i18n` — parity green.
- [ ] **Step 5** Coverage grep on the 5 files.
- [ ] **Step 6** `bunx tsc --noEmit`.
- [ ] **Step 7** Commit: `feat(i18n): translate auth`.

---

## Task 6: Level-map + conversation namespace

**Files (Modify):**
- `components/game/level-map/LevelMap.tsx`
- `components/game/level-map/MapEditorPanel.tsx`
- `components/game/level-map/MapLetterbox.tsx`
- `components/game/level-map/MapUi.tsx`
- `components/game/conversation-parchment.tsx`
- `components/game/character-card-modal.tsx`
- `components/game/king-briefing-panel.tsx`
- `components/game/reputation-bar.tsx`
- `components/game/story-beat-screen.tsx`
- `components/game/start-intro.tsx`
- `lib/i18n/messages/pl.ts`, `en.ts` (add `level` namespace)

- [ ] **Step 1** Add `level` keys to `pl.ts` verbatim (include `aria-label`s like `"Zamknij kartę postaci"`, `"Podgląd rozmowy z postacią"`).
- [ ] **Step 2** Add English `level` keys to `en.ts`.
- [ ] **Step 3** Replace call sites (`useT()`; all client).
- [ ] **Step 4** `bun test lib/i18n` — parity green.
- [ ] **Step 5** Coverage grep on the 10 files.
- [ ] **Step 6** `bunx tsc --noEmit`.
- [ ] **Step 7** Commit: `feat(i18n): translate level/conversation UI`.

---

## Task 7: Outcome modals namespace (defeat/victory/score/dice/action)

**Files (Modify):**
- `components/game/defeat-modal.tsx`
- `components/game/victory-modal.tsx`
- `components/game/score-card.tsx`
- `components/game/DiceRollerOverlay.tsx`
- `components/game/PendingActionModal.tsx`
- `components/game/sage-key-guess-panel.tsx`
- `lib/i18n/messages/pl.ts`, `en.ts` (add `outcome` namespace)

- [ ] **Step 1** Add `outcome` keys to `pl.ts` verbatim (e.g. `"PORAŻKA"`, `"KRYTYCZNA PORAŻKA"`).
- [ ] **Step 2** Add English `outcome` keys to `en.ts` (`"DEFEAT"`, `"CRITICAL FAILURE"`).
- [ ] **Step 3** Replace call sites (`useT()`).
- [ ] **Step 4** `bun test lib/i18n` — parity green.
- [ ] **Step 5** Coverage grep on the 6 files.
- [ ] **Step 6** `bunx tsc --noEmit`.
- [ ] **Step 7** Commit: `feat(i18n): translate outcome modals`.

---

## Task 8: Chronicle + epilogue + endings namespace

**Files (Modify):**
- `components/game/chronicle-panel.tsx`
- `components/game/ending-slides.tsx`
- `app/epilog/page.tsx`
- `app/epilog/ending-slides-wrapper.tsx`
- `app/attempt/[id]/page.tsx`
- `lib/i18n/messages/pl.ts`, `en.ts` (add `chronicle` namespace)

- [ ] **Step 1** Add `chronicle` keys to `pl.ts` verbatim.
- [ ] **Step 2** Add English `chronicle` keys to `en.ts`.
- [ ] **Step 3** Replace call sites. `app/epilog/page.tsx` and `app/attempt/[id]/page.tsx` — resolve server vs client and use the matching accessor.
- [ ] **Step 4** `bun test lib/i18n` — parity green.
- [ ] **Step 5** Coverage grep on the 5 files.
- [ ] **Step 6** `bunx tsc --noEmit`.
- [ ] **Step 7** Commit: `feat(i18n): translate chronicle/epilogue`.

---

## Task 9: Player panel + billing + voice/audio namespace

**Files (Modify):**
- `components/game/player-panel.tsx` (also replace `"Zapisywanie języka..."`, `"Nie udało się zapisać języka."`)
- `components/billing/attempt-purchase-modal.tsx`
- `components/game/voice-input-button.tsx`
- `components/audio/audio-debug-panel.tsx`
- `lib/billing/config.ts` — pack `label`/`description` strings (e.g. `"5 podejść"`, `"Mały zapas szans na kolejne rozmowy."`) are shown in the purchase modal. Convert to a locale-aware accessor: keep prices/ids as-is, move `label`/`description` into the `billing` catalog namespace keyed by pack id, and expose a helper that reads them by `locale`. Update `attempt-purchase-modal.tsx` (and any other consumer) to resolve labels via `useLocale()`/`t.billing.*`.
- `lib/billing/attempts.server.ts` — line ~110 fallback `` `Pakiet ${entry.amount} podejść` `` is a player-facing description fallback; make it locale-aware (thread the locale already resolved server-side, use `t.billing.packFallback(amount)`).
- `lib/i18n/messages/pl.ts`, `en.ts` (add `playerPanel`, `billing` namespaces)

- [ ] **Step 1** Add `playerPanel` + `billing` keys to `pl.ts` verbatim.
- [ ] **Step 2** Add English keys to `en.ts`.
- [ ] **Step 3** Replace call sites (`useT()`).
- [ ] **Step 4** `bun test lib/i18n` — parity green.
- [ ] **Step 5** Coverage grep on the 4 files.
- [ ] **Step 6** `bunx tsc --noEmit`.
- [ ] **Step 7** Commit: `feat(i18n): translate player panel + billing`.

---

## Task 10: OG victory image route

**Files (Modify):**
- `app/api/og/victory/route.tsx`
- `lib/i18n/messages/pl.ts`, `en.ts` (add `og` namespace)

- [ ] **Step 1** The route reads `searchParams` (`app/api/og/victory/route.tsx:7`); `quote`/`rank`/`time` are already dynamic query params. The only hardcoded Polish is the `quote` fallback default `"Przekonano postać"` (line 8). Add a `?locale=` query param read via `normalizeLocale(searchParams.get("locale"))`, defaulting to `"en"`.
- [ ] **Step 2** Add `og.defaultQuote` to `pl.ts` (`"Przekonano postać"`) + `en.ts` (`"The character was convinced"`).
- [ ] **Step 3** Replace the fallback: `searchParams.get("quote") ?? getDictionary(locale).og.defaultQuote`.
- [ ] **Step 4** `bun test lib/i18n` — parity green.
- [ ] **Step 5** Coverage grep on the file.
- [ ] **Step 6** `bunx tsc --noEmit`.
- [ ] **Step 7** Commit: `feat(i18n): localize OG victory image`.

---

## Task 11: `lib/game` display content → `content` namespace

Only files that produce **display strings** shown to the player. Convert each
constant/function to accept `locale: Locale` and read from `getDictionary(locale)`.
Thread `locale` from callers (callers already have it: server engine resolves via
`localeFromProfileSettings`; components pass `useLocale()`).

**Files (Modify) — display content only.** Split into two sub-tasks for reviewability:
- **11a (narration/hints):** `lib/game/defeat-copy.ts`, `lib/game/thinking-phrases.ts`, `lib/game/cinematic-narration.ts`, `lib/game/coaching-hints.ts`
- **11b (character/emotion cluster):** `lib/game/character-card.ts`, `lib/game/emotion-display.ts`, `lib/game/level-emotions.ts` (label strings only — this file is also imported widely for non-display emotion data; only `getLevelEmotionLabels` output is display)
- `lib/i18n/messages/pl.ts`, `en.ts` (add `content` namespace)
- Test: `lib/game/__tests__/content-locale.test.ts`

**MOVED TO TASK 16 (not display — input-matching / grammar logic, must not be string-swapped):**
`lib/game/conversation-greetings.ts` (Polish instrumental-case declension `declineCharacterNameWithZ` + greeting generation; has a pre-existing failing test), `lib/game/king-agreement.ts` (`kingAgreementMet(message): boolean` matches Polish phrases), `lib/game/mila-concession.ts` (`milaConcessionMet(...): boolean` matches Polish). `lib/game/lore/chronicle-entries.ts` currently has no Polish literals (already sourced elsewhere) — no action.

**Interfaces:**
- Produces: each converted export gains a `locale: Locale` first or last param
  (keep consistent — use **last** param with default `"en"` where a signature
  is widely called, to minimize churn; document the choice in the file).

- [ ] **Step 1: Write a failing test** for one representative converted function

The real export is `getDefeatCopy(levelId: number, reason: DefeatReason): DefeatCopy`
(`lib/game/defeat-copy.ts:166`). It gains a trailing `locale: Locale` param.

```ts
// lib/game/__tests__/content-locale.test.ts
import { describe, expect, it } from "vitest";
import { getDefeatCopy } from "@/lib/game/defeat-copy";

describe("defeat copy locale", () => {
  it("returns Polish for pl", () => {
    // forced_demand is the level-1 red-line reason; use its real levelId.
    expect(getDefeatCopy(1, "forced_demand", "pl").title).toBe("Zamknęła się");
  });
  it("returns English for en", () => {
    expect(getDefeatCopy(1, "forced_demand", "en").title).toBe("She shut down");
  });
});
```

- [ ] **Step 2** Run: `bun test lib/game/__tests__/content-locale.test.ts` — FAIL.
- [ ] **Step 3** Move each file's Polish strings into `content.<file>` in `pl.ts`, add English in `en.ts`, and rewrite the file's exports to look up `getDictionary(locale)`. Update all callers to pass `locale`.
- [ ] **Step 4** Run: `bun test lib/game` — PASS.
- [ ] **Step 5** `bun test lib/i18n` — parity green.
- [ ] **Step 6** Coverage grep across the listed files.
- [ ] **Step 7** `bunx tsc --noEmit` (fixes every caller that now needs `locale`).
- [ ] **Step 8** Commit: `feat(i18n): localize lib/game display content`.

---

## Task 12: DB `i18n` column + engine fallback

**Files:**
- Create: `supabase/migrations/<ts>_game_levels_i18n_column.sql`
- Modify: `lib/supabase/database.types.ts` (add `i18n` to `game_levels` Row/Insert/Update)
- Modify: `lib/game/levels-client.ts` (read localized fields)
- Test: `lib/game/__tests__/levels-i18n.test.ts`

**Interfaces:**
- Consumes: `Locale`.
- Produces: `levelsFromApiRows(rows, progress, locale: Locale)` — new `locale` param;
  `objectiveFromRow(row, locale)` and `characterFromRow(row, locale)` read
  `row.i18n?.[locale]?.<field> ?? row.<field>`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/game/__tests__/levels-i18n.test.ts
import { describe, expect, it } from "vitest";
import { levelsFromApiRows } from "@/lib/game/levels-client";

const baseRow = {
  id: 1, slug: "mila", is_active: true, order_index: 0,
  title: "Milczenie Mili", character_name: "Dziecko Mila",
  archetype: "Ciekawska i wrażliwa", short_description: "…",
  difficulty_label: "łatwa", objective_type: "TARGET_UTTERANCE",
  objective_config: {}, i18n: { en: { character_name: "Child Mila", archetype: "Curious and sensitive" } },
} as any;

const progress = { /* minimal PlayerProgress */ } as any;

describe("levelsFromApiRows i18n", () => {
  it("uses English fields when locale=en", () => {
    const [lvl] = levelsFromApiRows([baseRow], progress, "en");
    expect(lvl.character.name).toBe("Child Mila");
    expect(lvl.character.archetype).toBe("Curious and sensitive");
  });
  it("falls back to base Polish columns when locale field missing", () => {
    const [lvl] = levelsFromApiRows([baseRow], progress, "pl");
    expect(lvl.character.name).toBe("Dziecko Mila");
  });
});
```

- [ ] **Step 2** Run: `bun test lib/game/__tests__/levels-i18n.test.ts` — FAIL (arity/missing i18n handling).
- [ ] **Step 3: Write the migration** (adds nullable JSONB, no data yet)

```sql
-- supabase/migrations/<ts>_game_levels_i18n_column.sql
alter table public.game_levels
  add column if not exists i18n jsonb not null default '{}'::jsonb;

comment on column public.game_levels.i18n is
  'Localized overrides, shape { "en": { title, character_name, archetype, objective_hint, publicDescription, backstory }, ... }. Base columns are the pl source/fallback.';
```

- [ ] **Step 4** Add `i18n: Json` to the `game_levels` Row/Insert/Update in `lib/supabase/database.types.ts` (match existing `Json` import/type usage in that file).
- [ ] **Step 5** Update `lib/game/levels-client.ts`: add a `locale: Locale` param to `levelsFromApiRows`, `objectiveFromRow`, `characterFromRow`; resolve `const loc = (row.i18n as Record<string, Record<string,string>> | null)?.[locale];` and use `loc?.character_name ?? row.character_name`, `loc?.archetype ?? row.archetype`, and `loc?.objective_hint ?? config.hint` in the objective. NOTE: a grep shows `levelsFromApiRows` currently has **no static callers** (the levels page uses `getLevelsWithProgress` from `mock-levels`); this function is the DB-backed path. Do not add a silent default locale — when the DB path is wired, the caller must pass the resolved locale. If `bunx tsc --noEmit` reports no callers, that is expected.
- [ ] **Step 6** Run: `bun test lib/game/__tests__/levels-i18n.test.ts` — PASS.
- [ ] **Step 7** `bunx tsc --noEmit`.
- [ ] **Step 8** Commit: `feat(i18n): game_levels i18n column + engine fallback`.

---

## Task 13: DB English backfill migration

**Files:**
- Create: `supabase/migrations/<ts>_game_levels_i18n_english_backfill.sql`

- [ ] **Step 1** Enumerate the seeded levels: read every `insert into public.game_levels`/`update` in `supabase/migrations/*.sql` to collect each level's `title`, `character_name`, `archetype`, objective hint, `publicDescription`, and backstory (Polish source).
- [ ] **Step 2** Write one `update` per level setting `i18n = jsonb_set(i18n, '{en}', '<json>'::jsonb)` with English translations of those fields. Example:

```sql
-- supabase/migrations/<ts>_game_levels_i18n_english_backfill.sql
update public.game_levels
set i18n = jsonb_set(
  i18n, '{en}',
  jsonb_build_object(
    'title', 'The Silence of Mila',
    'character_name', 'Child Mila',
    'archetype', 'Curious and sensitive',
    'objective_hint', 'Speak slowly and concretely.',
    'publicDescription', 'She gets distracted and answers in a fairy-tale way.'
  )
)
where slug = 'mila';
-- …one update per level…
```

- [ ] **Step 3** Apply migrations locally and verify: run the project's migration command (check `package.json`/`supabase/` for the workflow, e.g. `supabase db reset` or `supabase migration up`), then query `select slug, i18n->'en'->>'title' from game_levels;` and confirm every active level has non-null English fields.
- [ ] **Step 4** Commit: `feat(i18n): backfill English game_levels content`.

---

## Task 14: Bilingual auth email

**Files (Modify):**
- `supabase/email-templates/confirm-signup.html`
- `supabase/email-templates/confirm-signup.subject.txt`

- [ ] **Step 1** Read both files.
- [ ] **Step 2** Rewrite `confirm-signup.html` so the body shows the English message first, then a visually separated Polish block (same CTA link/token variables in both). Preserve all Supabase template variables (`{{ .ConfirmationURL }}` etc.) exactly.
- [ ] **Step 3** Rewrite `confirm-signup.subject.txt` to a bilingual subject, e.g. `Confirm your account / Potwierdź konto`.
- [ ] **Step 4** Commit: `feat(i18n): bilingual signup confirmation email`.

---

## Task 15: Language-switch refresh

**Files (Modify):**
- `components/game/player-panel.tsx`

- [ ] **Step 1** In `saveLocale`, after a successful profile save, call `router.refresh()` (import `useRouter` from `next/navigation`) so server-rendered static text re-renders in the new language. Keep the `setLocale` optimistic update for client strings.
- [ ] **Step 2** Manually verify (dev server): toggling PL↔EN updates both client strings (immediately) and server-rendered text (after refresh).
- [ ] **Step 3** `bunx tsc --noEmit`.
- [ ] **Step 4** Commit: `feat(i18n): refresh server text on locale switch`.

---

## Task 16: Input-matching heuristics audit (scoped follow-up)

Several files hold Polish strings used to **match player input** or feed AI
judges, not display it: `lib/game/resistance-triggers.ts`,
`flattery-triggers.ts`, `reputation-triggers.ts`, `polish-number-words.ts`,
`text/fold-polish.ts`, `utterance-readiness.ts`, phrase lists in
`mock-judge.ts`/`objectives.ts`, and the AI judge prompts
`lib/ai/objective-completion-prompts.ts` + `lib/ai/sage-key-guess-prompts.ts`
(which contain hardcoded Polish few-shot examples of player utterances).
Also audit `lib/voice/speech-plan.ts` (a Polish-aware punctuation regex — likely
locale-neutral, confirm). **Moved here from Task 11** (these are logic, not display
strings, and need locale-branching, not translation): `lib/game/conversation-greetings.ts`
(instrumental-case declension + greeting generation; owns the pre-existing failing
test `conversation-greetings.test.ts` — an English-locale path must not break the
Polish test), `lib/game/king-agreement.ts` and `lib/game/mila-concession.ts`
(boolean matchers over Polish character messages — in English locale they need
English matching or must be gated/handled by the AI judge).
In English locale these heuristics won't fire on English input. Full localization
of matching logic is a **separate workstream** beyond static-text translation.

- [ ] **Step 1** Grep each listed file and classify every Polish string: (a) displayed → already handled in Task 11, move if missed; (b) input-matching → list it.
- [ ] **Step 2** For each input-matching site, decide and document one of: locale-gate (only run the Polish matcher when `locale==="pl"`), or add an English matcher. Where an English matcher is non-trivial, record it as a known limitation.
- [ ] **Step 3** Write findings to `docs/superpowers/specs/2026-07-22-english-input-matching-followup.md` (what's covered, what's deferred, recommended approach). Do NOT expand this plan's scope to implement English matchers unless trivial.
- [ ] **Step 4** Commit: `docs(i18n): input-matching heuristics audit`.

---

## PLAN EXTENSION (post-Task-16): closing gaps the audit found

The Task 16 audit (`docs/superpowers/specs/2026-07-22-english-input-matching-followup.md`,
independently fact-checked) found that several files it was asked to *assess*
turned out to hold genuine Task-11-scope **display text** that earlier file
lists missed, plus one **hard gameplay blocker**. These directly contradict
the goal "translate the whole game" (every level's opening line is still
Polish; level 7 cannot be completed in English at all), so they are closed
here rather than left as a mere follow-up note. Tasks 18–21 below.

---

## Task 18: Fix the level-7 (God) completion blocker

**Root cause:** `combineObjectiveMetJudges` (`lib/game/evaluate-objective-met.ts:26-42`)
ANDs `strictMet && aiMet` for levels 5 and 7. For level 7, `evaluateStrictObjectiveMet`
(`lib/game/strict-objective-met.ts:126-132`) routes CONCESSION straight to
`godConcessionMet(characterMessage)` (lines 56-69), a 100%-Polish regex, with
**no fallback** to the DB-configurable `acceptedConcessionVariants` lower in the
same function. An AI-generated English reply will never match this regex, so
`strictMet` is always false in English play, and the downstream hard gate in
`lib/game/psychology/objective-pressure.ts` (lines 186-189 for CONCESSION) has
no bypass — level 7 cannot complete via the normal path in English regardless
of the AI judge's own verdict.

**Files:**
- Modify: `lib/game/evaluate-objective-met.ts` (`combineObjectiveMetJudges`, `evaluateObjectiveMet`)
- Modify: `lib/game/strict-objective-met.ts` (`evaluateStrictObjectiveMet` signature — needs `locale`)
- Modify: callers — `lib/game/psychology/process-turn.ts:451` and `lib/game/engine.server.ts:823` (both already resolve `locale` nearby; thread it through)
- Test: extend/add a case in whatever test file covers `evaluate-objective-met.ts` or `strict-objective-met.ts` (check `lib/game/__tests__/` for an existing one first)

**Approach:** Thread `locale: Locale` down to `combineObjectiveMetJudges`. For
`locale === "en"`, level 7 (and level 5, pending Task 20's DB-keyword check)
should behave like the other levels — `return aiMet` alone — since the strict
Polish heuristic cannot fire on English input and was never meant to be a
second English gate. For `locale === "pl"`, preserve the existing `strictMet && aiMet`
behavior exactly (no regression to the Polish game).

- [ ] **Step 1** Write a failing test: with `locale: "en"` and a character message that would fail `godConcessionMet` but where the AI judge says `aiMet: true`, `combineObjectiveMetJudges`/`evaluateObjectiveMet` for level 7 must return `true`. With `locale: "pl"` and the same inputs, it must still return `false` (unchanged Polish behavior).
- [ ] **Step 2** Run it — confirm it fails against current code.
- [ ] **Step 3** Add `locale: Locale` to `combineObjectiveMetJudges`'s signature and to `evaluateObjectiveMet`'s options object; change the levels-5/7 branch to `if ((levelId === 5 || levelId === 7) && locale === "pl") return strictMet && aiMet; if (levelId !== undefined) return aiMet;`. Update `evaluateStrictObjectiveMet`'s call site in `evaluateObjectiveMet` if it also needs locale (it may not, if you only gate the combine step — prefer the smallest change that fixes the bug without touching `strict-objective-met.ts`'s internals). Update the two callers to pass `locale`.
- [ ] **Step 4** Run the test — GREEN.
- [ ] **Step 5** Run the full existing test suite for these files (`bunx vitest run lib/game`) — no new failures beyond the pre-existing unrelated `conversation-greetings.test.ts`.
- [ ] **Step 6** `bunx tsc --noEmit` — no new errors.
- [ ] **Step 7** Commit: `fix(i18n): level 7 completable in English (locale-gate strict&&AI requirement)`.

---

## Task 19: Translate `conversation-greetings.ts` display tables (not the declension logic)

**Files:**
- Modify: `lib/game/conversation-greetings.ts` — `GREETINGS_BY_LEVEL`, `LOW_RENOWN_CALLBACKS`, `HIGH_RENOWN_CALLBACKS` (display tables only)
- Modify: `lib/i18n/messages/pl.ts`, `en.ts` (extend `content` namespace with a `greetings` sub-object)
- Modify: callers up the chain so `getConversationGreeting` receives a `locale` — `lib/game/engine.server.ts:275` (`startAttempt`) and any psych-engine equivalent; check both the legacy and psych paths noted in the Task 16 audit.
- Do NOT touch `declineCharacterNameWithZ` or `lib/game/__tests__/conversation-greetings.test.ts` — that function and its Polish declension test stay Polish-only. For `locale === "en"`, the greeting sentence must be built WITHOUT declension (English doesn't decline nouns) — use a plain English template, e.g. `` `A rumor about your meeting with ${name} reached here.` ``.

- [ ] **Step 1** Add a `content.greetings` namespace to `pl.ts` (verbatim Polish tables) and `en.ts` (natural English translations, matching established character names from the glossary).
- [ ] **Step 2** Add `locale: Locale` to `getConversationGreeting` and `reputationToneForPrompt` if the latter also holds display text (check — the audit didn't flag it as display, likely leave it). Inside `getConversationGreeting`, branch: `locale === "pl"` uses the existing declined-sentence logic (unchanged); `locale === "en"` uses the English template with no declension.
- [ ] **Step 3** Thread `locale` from `startAttempt` call sites through to `getConversationGreeting`.
- [ ] **Step 4** Run `bunx vitest run lib/game/__tests__/conversation-greetings.test.ts` — the existing Polish declension tests must still pass unchanged (they don't pass a locale or pass `"pl"` implicitly — verify the test file's calls still compile/pass as-is).
- [ ] **Step 5** `bunx vitest run lib/i18n` — parity green.
- [ ] **Step 6** `bunx tsc --noEmit` — no new errors.
- [ ] **Step 7** Coverage grep on `conversation-greetings.ts` for the GREETINGS/CALLBACKS tables specifically (the declension helper's internal Polish suffix strings are expected to remain — they're grammar logic, not display).
- [ ] **Step 8** Commit: `feat(i18n): translate conversation-greetings display tables`.

---

## Task 20: Translate `reputation.ts` rumor text + `reputation-triggers.ts` praise map

**Files:**
- Modify: `lib/game/reputation.ts` — `INCIDENT_RUMORS`, the generic renown-threshold rumor fallbacks (~lines 432-447 — these are the ones that DO fire regularly for English play per the audit), `REPUTATION_INCIDENT_LABELS`
- Modify: `lib/game/reputation-triggers.ts` — `POSITIVE_REPUTATION_PRAISE` (~lines 211-222)
- Modify: `lib/i18n/messages/pl.ts`, `en.ts` (extend `content` namespace)
- Modify: callers of `buildRumorLine`/`formatRumorForDisplay` (check `lib/game/engine/snapshot.ts:37` and `conversation-greetings.ts:90` per the audit) to thread `locale`

- [ ] **Step 1** Add rumor/label text to `pl.ts`/`en.ts` under `content.reputation`.
- [ ] **Step 2** Add `locale: Locale` to the relevant functions in `reputation.ts` and `reputation-triggers.ts`; source text from the catalog.
- [ ] **Step 3** Thread `locale` through `buildRumorLine`/`formatRumorForDisplay`/`snapshot.ts` callers.
- [ ] **Step 4** `bunx vitest run lib/game` — only the pre-existing unrelated failure remains.
- [ ] **Step 5** `bunx vitest run lib/i18n` — parity green.
- [ ] **Step 6** `bunx tsc --noEmit` — no new errors.
- [ ] **Step 7** Coverage grep on both files.
- [ ] **Step 8** Commit: `feat(i18n): translate reputation rumor + praise text`.

---

## Task 21: Translate fallback dialogue (psych-engine + design-mechanic fallbacks)

These are reachable in **normal play** (not just AI-outage), per the Task 16 audit.

**Files:**
- Modify: `lib/game/psychology/mock-psych-character.ts` — `RESISTANCE`, `WARM_NEUTRAL`, `CRACK` (AI-outage fallback dialogue)
- Modify: `lib/game/objectives.ts` — `buildTargetUtteranceFallback` (design-mechanic fallback at high pressure — reachable in normal play, not an error path)
- Modify: `lib/game/psychology/process-turn.ts` — local `safeFallbackMessage` (~lines 516-521, normal-play trigger for early-target/forbidden-reveal)
- Modify: `lib/i18n/messages/pl.ts`, `en.ts` (extend `content` namespace)
- Thread `locale` from each function's existing callers (`process-turn.ts` already has `locale` in scope for most of these per the psych engine's locale-aware AI calls — verify before threading a new param).

- [ ] **Step 1** Add fallback dialogue text to `pl.ts`/`en.ts` under `content.fallbackDialogue`, matching each character's established voice.
- [ ] **Step 2** Add `locale: Locale` params, source from catalog.
- [ ] **Step 3** Thread locale through callers.
- [ ] **Step 4** `bunx vitest run lib/game` — only the pre-existing unrelated failure remains.
- [ ] **Step 5** `bunx vitest run lib/i18n` — parity green.
- [ ] **Step 6** `bunx tsc --noEmit` — no new errors.
- [ ] **Step 7** Coverage grep on the 3 files.
- [ ] **Step 8** Commit: `feat(i18n): translate psych-engine + design fallback dialogue`.

---

## Task 22: Final verification

- [ ] **Step 1** `bunx vitest run` (full suite) — all green except the pre-existing unrelated `conversation-greetings.test.ts` Polish-declension failure (confirm it's still the SAME failure, not a new one).
- [ ] **Step 2** `bunx tsc --noEmit` — no errors (beyond that same pre-existing one).
- [ ] **Step 3** `bun run build` — succeeds.
- [ ] **Step 4** Full coverage grep excluding out-of-scope + comments:
  `grep -rnE "[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]" app components --include="*.tsx" | grep -v "/admin/"` — confirm remaining hits are only comments, the bilingual email, or Polish-source dictionary values in `pl.ts` (expected).
- [ ] **Step 5** Manual smoke test (dev server): play through with locale=en — landing, login, level map, a conversation (including its opening greeting), a defeat, a victory, chronicle, epilogue, player panel, purchase modal, and — given Task 18 — attempt to complete level 7 (God) to confirm it's no longer blocked. Confirm English throughout and no missing-key crashes.
- [ ] **Step 6** Commit any final fixes: `chore(i18n): final verification fixes`.

---

## Self-Review notes (coverage map)

- Spec §1 catalog → Task 1. §2 resolution → Tasks 2–3. §3 lib/game content → Tasks 11, 19, 20, 21.
  §4 DB JSONB → Tasks 12–13. §5 emails → Task 14. §6 switch UX → Task 15.
  §7 testing → Tasks 1, 11, 12 + Task 22. §8 rollout order → task order.
- Out-of-scope (admin, docs) is never touched; Task 22 grep excludes `/admin/`.
- **Known, deliberately-deferred scope boundary:** the *secondary* input-matching
  heuristics (red-line/positive-line/flattery trigger-word lists, AI-judge
  few-shot examples in `lib/ai/*prompts.ts`) remain Polish-only per Task 16's
  audit — they degrade flavor/consistency but don't block gameplay, confirmed
  by the AI-judge-primary architecture. This is documented in
  `docs/superpowers/specs/2026-07-22-english-input-matching-followup.md` as
  explicit future work, not silently dropped.
- **Closed via the plan extension (Tasks 18-21):** the one hard gameplay blocker
  (level 7) and the display-text misses the audit surfaced (greeting tables,
  reputation rumors, fallback dialogue) — these were within the original
  "translate the whole game" goal and are fixed, not just documented.
