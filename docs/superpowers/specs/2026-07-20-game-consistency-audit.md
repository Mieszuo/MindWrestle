# Audyt spójności rozgrywki + domknięcie ekonomii — ConvinceMe / MindWrestle

Data: 2026-07-20. Status: **audyt (ocena), nic nie naprawione**. Metoda: 3 niezależne subagenty (osiągalność celów, normalizacja tekstu, kontekst judge'a) + samodzielna weryfikacja 4 najcięższych znalezisk w kodzie.

Motyw przewodni: **większość bugów jest zamaskowana, gdy żyje AI, i ujawnia się w trybie `mock`/fallback** — a fallback włącza się przy każdym timeoucie / rate-limicie / złym JSON od modelu. To tłumaczy zgłaszane "czasem się nie dało przejść": porażki są niedeterministyczne.

---

## Znaleziska rozgrywkowe (severity malejąco)

> **Status 2026-07-20:** znaleziska **1–6 zaimplementowane** na gałęzi `game-consistency-fixes` (plan: [2026-07-20-game-consistency-fixes.md](../plans/2026-07-20-game-consistency-fixes.md); testy 133/134, jedyny fail to niezwiązany baseline `conversation-greetings`). Świadome zawężenia: foldowanie sage tylko w `sageKeyLocationRevealMet` (chroni test „vague guess"); AND-veto tylko dla L7 (kruche regexy L1–6 zawetowałyby poprawne wygrane); dla TARGET_UTTERANCE tylko foldowanie diakrytyków — liczebniki i `matchMode` odłożone (brak żywego poziomu tego typu). Znaleziska **7–9 (LOW) — nietknięte**.

### BLOCKER-1 — Poziomy 6 i 7 nie do przejścia w trybie mock (i kruche z AI)
- Kod: [objective-pressure.ts:89-107](../../../lib/game/psychology/objective-pressure.ts), [process-turn.ts:241](../../../lib/game/psychology/process-turn.ts), mock: `lib/game/psychology/mock-psych-judge.ts`, config: `supabase/migrations/20250621150000_systemic_lore_gates.sql`.
- Brama lore L6/L7 (`genericPersuasionCanWin:false`) przechodzi tylko gdy `usedTruthIds` niepuste, a to ustawia się **wyłącznie** gdy `reactionTags` zawiera `uses_previous_lore` — tag emitowany tylko przez żywy AI judge. Mock go nigdy nie produkuje, `process-turn` też nie. Efekt: gdy judge to mock (wspierany tryb), L6 i L7 zwracają `INSUFFICIENT_LORE_EVIDENCE` na każdej turze → **niewygrywalne**. Z AI: pojedyncza awaria modelu na decydującej turze blokuje wygraną; dodatkowo `detectLoreUse` musi niezależnie dopasować ≥ wymaganej liczby fragmentów.
- Dokładnie klasa "nie dało się pokonać".
- Kierunek naprawy: `uses_previous_lore` wyprowadzić deterministycznie z `loreUse` (nie polegać na tagu AI); `usedTruthIds` brać wprost z `loreUse.candidateFragments`.

### HIGH-2 — "trzysta" ≠ 300: negocjacja ceny czyta tylko cyfry (L2)
- Kod: [objective-completion-helpers.ts:8-36](../../../lib/game/objective-completion-helpers.ts).
- `extractPricesFromMessage` regex `/\d[\d\s]{0,6}\d|\d+/g` — same cyfry. Postać mówi "trzysta monet" → `prices=[]` → `negotiatedPriceMet=false`. W mock → twardy fail (dokładny przykład zgłoszony przez właściciela). Z AI ratuje `objectiveMetByJudge`.
- Dodatkowo **fałszywa akceptacja**: `lastPrice = prices[prices.length-1]` bierze ostatnią liczbę w zdaniu. "Zgoda na 450 monet. Klucz strzeże bramy od 300 lat." → `[450,300]` → `lastPrice=300 ≤ 300` → fałszywa wygrana przy realnej cenie 450.
- Kierunek: normalizator liczebników PL→int + wiązanie ceny z kontekstem waluty ("monet"), nie "ostatnia liczba".

### HIGH-3 — Zgadywanie Kamienia Zapisu (L5) odrzuca odpowiedzi bez diakrytyków / w odmianie
- Kod: [objective-completion-helpers.ts:38-54](../../../lib/game/objective-completion-helpers.ts), [evaluate-sage-key-guess.ts](../../../lib/game/evaluate-sage-key-guess.ts), combine: [evaluate-objective-met.ts:35-38](../../../lib/game/evaluate-objective-met.ts).
- Guess przechodzi przez `strictMet && aiMet`. Strict = `countRevealKeywordMatches` (`lower.includes(key)`, brak foldowania diakrytyków) lub `sageKeyLocationRevealMet` (`/trzeci\s+krok/` + `/(cień|kamień|kamien|bibliotek)/` — folduje `kamień→kamien`, ale nie `cień→cien`).
- "Kamien lezy w cieniu trzeciego kroku" (bez ogonków, naturalna odmiana) → 0 dopasowań, regex `trzeci krok` nie łapie `trzeciego kroku` → strict=false → **poprawna odpowiedź odrzucona** mimo że AI ją akceptuje.
- Kierunek: wspólny `foldPolish()` (lowercase + NFD + strip `\p{M}` + `ł→l`) + odmienialne formy `trzeci krok`; dla sage zaufać AI (strict jako OR-fallback, nie AND-veto).

### HIGH-4 — Bóg (L7) sądzony jak łagodne CONCESSION → finałowy boss do pokonania pustą metaforą
- Kod: [objective-completion-prompts.ts:100-129](../../../lib/ai/objective-completion-prompts.ts), gating: [process-turn.ts:421-439](../../../lib/game/psychology/process-turn.ts), config: `supabase/migrations/20250619120000_levels_objectives_and_voice.sql:96-108`.
- L7 ma `objective_type=CONCESSION`, więc judge dostaje **łagodny ton** ("metafory na temat się liczą"), sprzeczny z `godStrictRules` 20 linii niżej ("poetyckie uniki = FALSE"). CONCESSION omija bramę `modeReady`, a strict veto jest martwe (HIGH-5). Efekt: Bóg "wyjawia prawdę" pustą mistyczną frazą w `full_resistance` → trywialna wygrana finału.
- Kierunek: przetypować L7 na `SECRET_REVEAL` (dziedziczy surowy ton + `modeReady`) albo wyłączyć L7 z łagodnego tonu i przywrócić deterministyczne veto `godConcessionMet`.

### HIGH/MEDIUM-5 — Prompt judge'a obiecuje deterministyczne AND-veto, którego nie ma
- Kod: [evaluate-objective-met.ts:32-34](../../../lib/game/evaluate-objective-met.ts) vs [objective-completion-prompts.ts:116](../../../lib/ai/objective-completion-prompts.ts).
- `combineObjectiveMetJudges` dla każdego poziomu poza 5 zwraca **sam `aiMet`**. Per-level checkery (`milaConcessionMet`, `kingAgreementMet`, `godConcessionMet`…) są liczone i **wyrzucane**. Prompt mówi modelowi, że strict rule zawetuje AND — nieprawda. Efekt: pojedynczy halucynowany `objectiveMet=true` kończy poziom bez zabezpieczenia (L1,2,3,4,6,7). To druga strona tej samej monety co BLOCKER-1 (brak deterministycznego backstopu).
- Kierunek: albo faktycznie AND-ować strict dla AGREEMENT/SECRET_REVEAL/CONCESSION (jak obiecuje prompt), albo usunąć martwe checkery i zdanie o AND.

### MEDIUM-6 — TARGET_UTTERANCE: exact-word, wrażliwy na diakrytyki/odmianę/liczebniki (latentny)
- Kod: [text-validator.ts:5-22](../../../lib/game/text-validator.ts), [objectives.ts:41-99](../../../lib/game/objectives.ts).
- Żaden poziom nie używa dziś TARGET_UTTERANCE (L1 przełączono na CONCESSION), ale ścieżka jest w pełni podpięta i przetestowana. `normalizeText` (NFKC — **nie** usuwa diakrytyków) + `containsExactWord` (całe tokeny). Odrzuci: odmianę (`jabłko` vs `jabłek`), diakrytyki (`córka` vs `corka`), liczebnik↔cyfra (`300` vs `trzysta` — pierwotny przykład). Pole `matchMode` z configu **nie jest nigdzie czytane**.
- Kierunek: foldowanie diakrytyków w `normalizeText`, normalizacja liczebników, uwzględnić `matchMode` (albo usunąć).

### LOW-7 — L2: stały config "amulet" w promptcie judge'a vs "srebrny klucz" postaci
- `objective_config.playerGoal` L2 = "Wynegocjuj amulet…" (migracja `20250619120000`), nigdy nie zaktualizowane, choć `character_config` zmieniono na "srebrny klucz". Judge widzi sprzeczny obiekt. Wzorzec "stale config dociera do judge'a". Kierunek: zsynchronizować `playerGoal`.

### LOW-8 — Strict bloki kluczowane na `level.id` + hardcoded `objective_type` (mechanizm historycznych bugów)
- [objective-completion-prompts.ts:30-110](../../../lib/ai/objective-completion-prompts.ts): każdy blok `level.id === N && objective_type === "…"`. Zmiana `objective_type` w DB **cicho wyłącza** blok → judge sądzi łagodniejszym generykiem. To dokładnie mechanizm "judge sprawdzał pod złym kątem" z przeszłości. Dziś wszystkie się zgadzają, ale brak asercji wiążącej. Kierunek: sterować rubryką z configu poziomu albo test startowy sprawdzający zgodność bloków z DB `objective_type`.

### LOW-9 — Dryf mirror TS vs SQL (progi porażki)
- Runtime czyta `DEFEAT_CONFIG_BY_LEVEL` (TS), nie kolumnę DB `defeat_config`. L1 w TS pomija 2 wyzwalacze red-line z migracji. Robi L1 łatwiejszym, nie blokuje. Kierunek: regenerować mirror z finalnej migracji albo czytać kolumnę DB.

### Werdykt przechodliwości per poziom (z liczbami, tryb z żywym AI)
L1 Mila ✅, L2 Trader ✅ (ale HIGH-2), L3 Rycerz ✅, L4 Ork ✅, L5 Mędrzec ✅ (ale HIGH-3), **L6 Król ⚠️ tylko z AI**, **L7 Bóg ⚠️ tylko z AI + HIGH-4**. W trybie mock: **L6 i L7 nieprzechodliwe**.

---

## Ekonomia — domknięty model i werdykt

Sterownik kosztu potwierdzony w kodzie: przy ustawionym `GEMINI_API_KEY` **character + psych_judge + objective judge idą wszystkie na Gemini 2.5 Flash** ($0.15/1M in, $0.60/1M out — [gemini.ts:103](../../../lib/ai/gemini.ts)). 2–3 wywołania LLM na turę gracza. Limit 25 wiadomości/próba; śr. realnie ~12–15 tur.

| Pozycja | Założenie | Koszt |
|---|---|---|
| Tura tekstowa | ~10k tok in + ~1.5k out × (2–3 wywołania) | ~$0.002–0.005 |
| **Próba tekstowa** | 12–15 tur | **~$0.03–0.10** |
| TTS/replika | v3, ~300 znaków × $0.10/1k | ~$0.03 |
| Głos w próbie | ~15 replik | **+$0.45–0.70** |
| **Próba głosowa** | tekst + głos | **~$0.50–0.80** |

Przychód netto/próba (po ~5% prowizji Stripe): pakiet 5 ≈ €0.57, pakiet 15 ≈ €0.44, pakiet 40 ≈ €0.36.

**Werdykt:**
- **Tryb tekstowy: pewny zysk.** Marża 80–95% na każdym pakiecie. To wynika wprost z cen API — matematycznie bezpieczne.
- **Tryb głosowy: dziś ryzyko straty.** $0.50–0.80 kosztu vs €0.36–0.57 przychodu → od zera do straty na najtańszych pakietach. Głos to jedyne realne zagrożenie marży.
- **Darmowy tier (3/mies):** tekstowo grosze; głosowo do ~$2.4/user/mies straty — niekontrolowany koszt akwizycji.

**Warunki pewności zysku (wszystkie muszą być spełnione):**
1. Faktyczne pobieranie opłat: żywa baza + Stripe live (jeszcze nie — patrz [audyt płatności](2026-07-20-payment-model-audit-design.md)).
2. **Budżet głosu per próba + tańszy model TTS** (Flash v2.5 $0.05/1k) — Etap 3 planu, niewdrożony. Po nim próba głosowa spada do ~$0.20–0.25 → marża 40–60%.
3. Ograniczony głos w darmowym tierze.

**Połączenie z bugami rozgrywki:** nieprzechodliwe L6/L7 i odrzucane poprawne odpowiedzi ("trzysta", zgadywanka Mędrca) → frustracja → zwroty i 1-gwiazdkowe opinie, które zjadają marżę i reputację. **Napraw przechodliwość ZANIM włączysz sprzedaż.**

---

## Rekomendowana kolejność napraw (osobny plan do spisania po akceptacji)
1. **Przechodliwość (przed sprzedażą):** BLOCKER-1 (deterministyczny `uses_previous_lore`), HIGH-2 ("trzysta"), HIGH-3 (foldowanie diakrytyków — wspólny `foldPolish()`). Tanie, wysokie ROI.
2. **Uczciwość sędziowania:** HIGH-4 (typ L7), HIGH/MEDIUM-5 (przywrócić AND-veto albo usunąć obietnicę).
3. **Higiena/anty-regresja:** LOW-7 (config L2), LOW-8 (asercja id↔type — zapobiega nawrotom historycznych bugów), LOW-9 (mirror), MEDIUM-6 (jeśli TARGET_UTTERANCE wróci).
