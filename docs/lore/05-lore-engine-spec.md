# Spec Lore Engine

Techniczna specyfikacja warstwy fabularnej obok istniejącego silnika rozmowy i renomy.

---

## 1. Model danych

### 1.1 `PlayerLoreState` (profil gracza — trwały)

```ts
type PlayerLoreState = {
  /** ID fragmentów odblokowanych po pierwszym ukończeniu poziomu */
  discoveredFragments: string[];
  /** levelId → true po pierwszym zobaczeniu post-level beat */
  completedLoreBeats: Record<string, boolean>;
  /** Pełne wpisy Kroniki (denormalizacja dla UI) */
  chronicleEntries: ChronicleEntry[];
  /** 0–7, opcjonalnie do UI postępu finału */
  finalTruthProgress: number;
  /** Czy gracz widział ending slides */
  endingSeen: boolean;
};

type ChronicleEntry = {
  id: string;                    // np. "mila-orchard-memory"
  levelId: number;
  levelSlug: string;
  title: string;                 // "Pierwsze Milczenie: Pamięć"
  narrativeText: string;         // chronicleEntry z matrycy
  clueText: string;              // nextLevelClue
  completionReveal?: string;     // wypowiedź NPC spinająca zwycięstwo mechaniczne ze StoryBeat
  imagePath?: string;
  unlockedAt: string;            // ISO
  relatedCharacterIds: number[];
};
```

**Przechowywanie:** kolumna `profiles.lore_state jsonb` (migracja) lub rozszerzenie `profiles.settings` — rekomendacja: **osobna kolumna** dla czytelności.

### 1.2 `LevelLoreConfig` (statyczne — repo + opcjonalnie DB)

```ts
type LevelLoreConfig = {
  fragmentId: string;
  arcRole: string;
  guardedSilence: string;
  hiddenTruth: string;           // tylko prompt AI / docs
  completionReveal: string;
  nextLevelClue: string;
  chronicleTitle: string;
  chronicleEntry: string;
  postLevelImage: string;
  promptBullets: string[];       // do knownLoreContext następnych poziomów
  loreTagsRewarded?: string[];
};
```

**Źródło:** `lib/game/lore/chronicle-entries.ts` (import z JSON) — jedna prawda w kodzie, sync z `docs/lore/data/chronicle-entries.json`.

### 1.3 Rozdzielenie od renomy

| | Renoma | Kronika |
|---|--------|---------|
| Co zapisuje | styl rozmowy (traits, incydenty) | treść świata (fragmenty) |
| Wpływ | plotki, start bias emocji | knownLoreContext, UI, bonus lore |
| Przenosi między poziomami | opinię o Wędrowcu | fakty fabularne |

**Nie mieszać** w jednym JSON bez wyraźnych pól.

---

## 2. Przepływ runtime

### 2.1 Start poziomu

```text
load level N
→ load PlayerLoreState
→ buildKnownLoreContext(level N)  // suma promptBullets z fragmentów 1..N-1
→ buildReputationContext (istniejące)
→ merge do attempt.reputation_context LUB nowe attempt.lore_context
→ greeting + opcjonalny briefing (Król: świadectwa)
→ inject knownLoreContext do psych-judge + psych-character (+ legacy jeśli używany)
```

### 2.2 Koniec poziomu (pierwsze ukończenie)

```text
objective completed
→ unlock fragmentId dla level N
→ append ChronicleEntry
→ finalTruthProgress = discoveredFragments.length
→ response API zawiera loreBeat payload (dla post-level screen)
→ dopiero potem VictoryModal (statystyki) LUB StoryBeatScreen → VictoryModal
```

### 2.3 Replay

- Post-level beat: **pomiń** lub pokaż skrócony „Już znasz ten fragment”.
- Kronika: wpis już istnieje — nie duplikować.
- `knownLoreContext`: bez zmian (fragmenty zostają).

---

## 3. API

### 3.1 Rozszerzenie odpowiedzi ukończenia próby

```ts
type LoreBeatPayload = {
  fragmentId: string;
  title: string;
  completionReveal: string;
  chronicleEntry: string;
  nextLevelClue: string;
  imagePath: string;
  isFirstDiscovery: boolean;
};
```

Dodać do istniejącego JSON końca próby: `loreBeat?: LoreBeatPayload`.

### 3.2 Nowe endpointy (propozycja)

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/player/chronicle` | Pełna Kronika + discoveredFragments |
| PATCH | `/api/player/chronicle/ending-seen` | Po slajdach finału |

Alternatywa: chronicle w `GET /api/player/profile` — mniej requestów.

---

## 4. Prompt integration

### 4.1 Judge (psych + legacy)

Dodać sekcję:

```text
Known lore discovered by the traveler (may use in this conversation):
{{knownLoreContext}}

Evaluate lore use:
- Reward respectful insight that connects fragments (tags: uses_previous_lore, connects_character_to_larger_truth).
- Reward respects_character_wound when player acknowledges pain without blackmail.
- Penalize weaponizes_lore (blackmail, dominance, cheap accusation).
- Penalize misreads_lore when player cites false connections.
- Lore must NOT auto-complete the objective.
- Lore may add +3 to +12 objectivePressure / beliefShift / secretPressure when quality is good.
```

Rozszerzenie JSON judge (psych):

```json
{
  "loreUse": {
    "usedPreviousLore": true,
    "quality": "respectful_insight | neutral | weaponized | misread",
    "tags": ["uses_previous_lore"]
  }
}
```

Implementacja v1 może być **tylko serwerowa** (regex + lista fragment keywords) bez wymagania AI — patrz etap 2 planu.

### 4.2 Character AI

```text
The traveler may reference fragments from the Chronicle of previous meetings.
If they cite TRUE discovered lore and the judge rewarded lore use:
- react with surprise, pain, denial, or respect — stay in character;
- do not exposition-dump the full truth;
- allow lore to create cracks in resistance per responseMode.
If they cite unknown or false lore: deflect or express confusion.
```

### 4.3 Bóg (poziom 7) — specjalny prompt

Na starcie próby: dołącz **listę wszystkich** `chronicleEntry` + `completionReveal` z odkrytych fragmentów.

Sędzia celu: bonus `objectiveMet` confidence gdy gracz w ostatnich turach łączy ≥3 lekcje (Mila–Król) — **miękki**, nie hard gate.

Wariant tonu finału (etap 3):
- wysoka pressure w renomie → Bóg komentuje, że Wędrowca wciąż traktuje słowa jak narzędzie nacisku,
- dignified_persuasion / wysoka warmth → pełniejszy finał Kroniki.

---

## 5. Nowe tagi lore

| Tag | Wykrywanie (v1) | Efekt |
|-----|-----------------|-------|
| `uses_previous_lore` | keyword match fragmentów + sensowna długość msg | +5..8 objectivePressure |
| `connects_character_to_larger_truth` | ≥2 fragmenty w jednej wiadomości | +8..12 (Mędrzec, Król, Bóg) |
| `respects_character_wound` | empatia bez żądania | +emotion positive |
| `weaponizes_lore` | szantaż, „wiem co zrobiłeś” + presja | red line lite, −pressure |
| `misreads_lore` | cytat sprzeczny z chronicle | −2..5 objectivePressure |

**Integracja z renomą:** `weaponizes_lore` → +pressure trait; `respects_character_wound` → +warmth (opcjonalnie).

Dodać do `reputation-triggers.ts` w etapie 2 — **osobna sekcja** `LORE_TAGS`, nie mieszać z POSITIVE_LINES_BY_LEVEL.

---

## 6. Detekcja lore use (v1 — bez AI)

```ts
function detectLoreUse(playerMessage: string, knownBullets: string[], levelId: number): LoreUseResult
```

- Normalizacja PL (lowercase, strip).
- Dla każdego bullet: kluczowe frazy (np. `srebrn`, `owoc`, `Mila`, `dług`, `Pęknięte`, `popiół`, `brama`, `milczen`).
- `connects`: ≥2 różne fragmentId matched.
- `weaponizes`: słowa typu `musisz`, `powiem wszystkim`, `zdradziłeś` + match lore.

AI judge może nadpisać w v2.

---

## 7. Pliki kodu (docelowa struktura)

```text
lib/game/lore/
  chronicle-entries.ts      # import JSON, eksport getLevelLore, getKnownBullets
  player-lore-state.ts      # parse, default, unlockFragment
  detect-lore-use.ts        # tagi v1
  build-lore-context.ts     # knownLoreContext dla promptów
  lore-beat-payload.ts      # mapowanie po wygranej

components/game/
  story-beat-screen.tsx     # pełnoekranowy beat (jak intro)
  chronicle-panel.tsx       # Kronika na mapie
  king-briefing-panel.tsx   # opcjonalnie przed poz. 6

components/game/endgame/
  ending-slides.tsx         # 5 slajdów po Bogu

supabase/migrations/
  YYYYMMDD_player_lore_state.sql
```

---

## 8. Testy (minimalne)

- `unlockFragment` idempotentny — drugi raz nie duplikuje.
- `buildKnownBullets(3)` zawiera Mila + Handlarz, nie Orka.
- `detectLoreUse` rozpoznaje cytat srebrnego owocu po Mili.
- Post-level payload zwracany tylko gdy `firstCompletion`.
- Reset gracza czyści `lore_state` (spójnie z `/api/player/reset`).

---

## 9. Migracja `character_config`

Dodać pole opcjonalne `lore: LevelLoreConfig` w DB **lub** trzymać lore tylko w repo (rekomendacja **repo-only v1** — mniej migracji Supabase).

Synchronizacja copy: JSON w docs → skrypt lub ręcznie → `lib/game/lore/data/chronicle-entries.json`.

Backstory w `character_config` **stopniowo** dopasować do kanonu (osobny PR content) — patrz [09-gaps-and-decisions.md](./09-gaps-and-decisions.md).
