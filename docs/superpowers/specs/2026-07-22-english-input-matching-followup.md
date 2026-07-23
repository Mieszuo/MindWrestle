# English input-matching / grammar-logic audit (Task 16)

Audit only — no game logic changed. Scope: files that hold Polish strings used to
**match input** (player or character text) or feed AI-judge prompts, as opposed to
strings that are simply displayed. Two additional files not in the original task
brief (`lib/game/reputation.ts`, `lib/game/psychology/mock-psych-character.ts`,
`lib/game/psychology/mock-psych-judge.ts`) turned out to hold **real display-text
misses** and are included below because they sit directly on the call paths the
brief asked to trace.

## Playability verdict

**Mostly true, with one confirmed hard blocker and one at-risk level.**

For 5 of 7 levels, objective completion is AI-judge-primary: the Polish
deterministic ("strict") checks are computed but their result is **discarded**.
`combineObjectiveMetJudges` (`lib/game/evaluate-objective-met.ts:26-42`):

```ts
if (levelId === 5 || levelId === 7) return strictMet && aiMet;
if (levelId !== undefined) return aiMet;   // <-- levels 1,2,3,4,6 land here
```

Since `evaluateObjectiveMet` always passes `level.id` (`lib/game/evaluate-objective-met.ts:92`),
every call from production code (`lib/game/psychology/process-turn.ts:451`,
`lib/game/engine.server.ts:823`) has `levelId` defined. So for levels 1
(Mila/`milaConcessionMet`), 2 (Trader/`negotiatedPriceMet`), 3 (Knight), 4 (Orc/`orcAgreementMet`),
6 (King/`kingAgreementMet`), the Polish regex heuristics are dead weight — the
AI judge alone decides `objectiveMet`, and the AI judge is already locale-aware
for the *character reply* language (`localePromptInstruction`, `lib/i18n/locale.ts:29`).
**These levels remain playable in English.**

Levels 5 and 7 are different: `combineObjectiveMetJudges` ANDs `strictMet && aiMet`,
and the hard gate downstream (`evaluatePsychObjectiveCompletion`,
`lib/game/psychology/objective-pressure.ts:148-150` for SECRET_REVEAL and
`:186-189` for CONCESSION) refuses completion outright when `objectiveMetByJudge`
is false — there is **no fallback path that bypasses this gate**, unlike
`TARGET_UTTERANCE`/other branches which have a pressure-based fallback.

- **Level 7 (God, CONCESSION) — confirmed blocker.** `evaluateStrictObjectiveMet`
  (`lib/game/strict-objective-met.ts:126-132`) routes `levelId === 7 && CONCESSION`
  straight to `godConcessionMet(characterMessage)` (`strict-objective-met.ts:56-69`),
  a 100%-Polish regex (`/prawda.{0,20}(świat|świecie|...)/` etc.), and **returns
  immediately** — it never falls through to the `acceptedConcessionVariants`
  DB-configurable fallback lower in the same function (that fallback is only
  reachable for levels/objective-types not already special-cased above it). An
  AI-generated English character reply for God will essentially never match this
  regex, so `strictMet` is false → `objectiveMet` is false → level 7 cannot
  complete via the normal path in English, regardless of how good the AI judge's
  own verdict is. This is the single highest-risk finding of this audit.
- **Level 5 (Sage, SECRET_REVEAL) — at risk, DB-dependent.** `minMatches` is 2
  for level 5 (`strict-objective-met.ts:89`); `revealKeywordsMet` first tries
  `acceptedRevealVariants`/`hiddenKnowledge.revealKeywords` (DB-driven —
  translation status not verified here, out of this code audit's scope), and
  only if that's short falls back to `sageKeyLocationRevealMet`
  (`lib/game/objective-completion-helpers.ts:75-80`), which is also
  Polish-only (`foldPolish` + `/trzec\w*\s+krok\w*/`, `/(cien|kamien|bibliotek)/`).
  If the level-5 DB config's keyword list isn't already translated to English,
  level 5 has the same failure mode as level 7. **Needs verification against the
  `game_levels` DB content for level 5**, flagged here as a dependency, not fixed.

Everything else audited below (red-line/positive-line/flattery detectors, price
dealLanguage, fallback dialogue templates, greeting/rumor text) affects
*flavor/secondary systems* (reputation tags, rumor lines, emotion-delta texture,
AI-outage fallback dialogue) rather than hard-blocking objective completion — see
per-file table.

## Per-file findings

| File | Classification | What it matches / feeds | Playability impact | Recommendation |
|---|---|---|---|---|
| `lib/game/conversation-greetings.ts` — `GREETINGS_BY_LEVEL`, `LOW_RENOWN_CALLBACKS`, `HIGH_RENOWN_CALLBACKS` (lines 4-31) | **(a) DISPLAY MISS** — should have been Task 11 | n/a — these are the literal first character line shown at the start of *every* level attempt | HIGH visibility, not a hard block: `getConversationGreeting` is called unconditionally in `startAttempt` (`lib/game/engine.server.ts:275`), for both legacy and psych-engine paths, in every locale. English players currently see a 100%-Polish opening line every single level. | Needs-English-matcher (translation, not a matcher). ~20 strings across 3 tables, matching established character voice. Not a 1-line fix — flagged for a Task-11-scope follow-up, not fixed here. |
| `lib/game/conversation-greetings.ts` — `declineCharacterNameWithZ` (lines 33-60) | (b) Polish grammar logic (instrumental-case noun declension) | Declines a Polish character name so it fits grammatically inside the Polish rumor sentence built in `getConversationGreeting` (`... Plotka o twoim spotkaniu z ${name} dotarła tu wcześniej.`) | LOW on its own — it's purely a helper for the Polish greeting sentence above; irrelevant to English text (English doesn't decline nouns) | **Locale-gate once greetings are translated**: for `locale === "en"`, skip declension and use an English template (`"A rumor about your meeting with ${name} reached here."` — no declension needed). Until greetings are translated this function is moot for English since the whole sentence stays Polish. Do not touch — owns the passing Polish test `conversation-greetings.test.ts`. |
| `lib/game/conversation-greetings.ts` — `getConversationGreeting` | (b) call-path gap | No `locale` param exists on this function or on `startAttempt()` at all | — | Needs-English-matcher: threading `locale` from wherever `startAttempt` is invoked down to this call is a real (small but multi-file) change, not a 1-liner. |
| `lib/game/king-agreement.ts` — `kingAgreementMet` | (b) input-matching, but on the **character's own message**, not player input (called as `kingAgreementMet(characterMessage)` from `strict-objective-met.ts:119`) | Level 6 (King) AGREEMENT strict check | **None** — discarded by `combineObjectiveMetJudges` for level 6 (see verdict above); only `aiMet` counts. | Already-covered-by-AI-judge. Leave as-is; optionally locale-gate later purely for code hygiene (dead weight for `locale==="en"`), not urgent. |
| `lib/game/mila-concession.ts` — `milaConcessionMet` | (b) input-matching on **character's own message** (`strict-objective-met.ts:95`, `evaluate-objective-met.ts` combine logic) | Level 1 (Mila) CONCESSION strict check | **None** — same reasoning; level 1 is not in the `{5,7}` AND-set, so only `aiMet` counts. | Already-covered-by-AI-judge. Leave as-is. |
| `lib/game/strict-objective-met.ts` — `godConcessionMet` (level 7) | (b) input-matching on character's own message | Level 7 (God) CONCESSION strict check, **ANDed with AI judge**, no fallback bypass | **CONFIRMED BLOCKER** — see verdict above | Needs-English-matcher or locale-gate at the `combineObjectiveMetJudges` level (e.g., for `locale==="en"` treat level 7 like the other non-5/7 levels and return `aiMet` alone, or add an English `godConcessionMet`). Requires threading `locale` into `evaluateObjectiveMet`/`evaluateStrictObjectiveMet`, which don't currently accept it — **not a 1-line fix**, left as the top-priority follow-up. |
| `lib/game/strict-objective-met.ts` — `knightConcessionMet` (level 3), `orcAgreementMet` (level 4) | (b) input-matching on character's own message | Levels 3/4 strict checks | **None** — both levels fall in the `aiMet`-only bucket. | Already-covered-by-AI-judge. |
| `lib/game/objective-completion-helpers.ts` — `negotiatedPriceMet` (`dealLanguage` regex) | (b) input-matching on character's own message | Level 2 (Trader) price negotiation strict check, feeding `priceMet` in `objective-pressure.ts:80` | **Low** for the hard AND-gate in `evaluateObjectiveMet` (discarded, level 2 not in `{5,7}`) — but `priceMet` is *also* read directly inside `evaluatePsychObjectiveCompletion` (`objective-pressure.ts:129-138`, price-negotiation branch): `if (!priceMet && !objectiveMetByJudge) return false;`. Since `objectiveMetByJudge` already carries the AI verdict, this is an OR-with-AI, not a second hard gate — so still not blocking, just redundant. | Already-mostly-covered-by-AI-judge; `dealLanguage` regex is Polish-only (`/zgadz|umow|handel stoi|bierz|...` etc.) and won't match English deal language, so it never contributes positively for English play, but doesn't block either since it's OR'd with the AI verdict. |
| `lib/game/objective-completion-helpers.ts` — `sageKeyLocationRevealMet`, `extractPricesFromMessage`/`NON_PRICE_UNIT` | (b) input-matching, Polish-only regex + `parsePolishNumbers`/`foldPolish` | Level 5 SECRET_REVEAL fallback path; price-unit exclusion in level-2 price extraction | See level-5 risk above; `NON_PRICE_UNIT` (words like "lat", "dni", "godzin") won't recognize English unit words ("years", "days") which could make English digit-adjacent price extraction slightly noisier (e.g. "300 years" wouldn't be excluded as a duration and could be misread as a price) — minor, not tested here. | Level 5 fallback: needs-English-matcher (see verdict). `NON_PRICE_UNIT`: minor, low priority, would need an English word list added — flag only. |
| `lib/game/polish-number-words.ts`, `lib/game/text/fold-polish.ts` | (b) Polish-specific text utilities | `parsePolishNumbers` (spelled-out Polish numbers), `foldPolish` (diacritic folding) — used by `objective-completion-helpers.ts` and `polish-number-words.ts` itself | Low direct impact — folding/parsing Polish diacritics on English text is a harmless no-op (no diacritics to strip, no Polish number-words to match); English spelled-out numbers ("three hundred") simply won't be recognized by `parsePolishNumbers`, so English players relying on spelled numbers in price talk lose that path (digit prices like "300" still work via `extractPricesFromMessage`'s digit regex, and the AI judge itself understands spelled English numbers semantically). | Needs-English-matcher only if spelled-out English numbers in price negotiation are considered important — otherwise leave; digits + AI judge cover the common case. |
| `lib/game/utterance-readiness.ts` | Locale-neutral | Pure numeric readiness scoring, no strings | None | No action — confirmed locale-neutral as the brief expected. |
| `lib/voice/speech-plan.ts` — `spokenWords` (`.toLocaleLowerCase("pl-PL")`, line 248) | (b) minor — hardcoded locale tag, not a matcher | Word-for-word comparison between display text and TTS-directed text (`preservesDisplayWords`) | **Negligible.** `pl-PL` vs `en`/generic case-folding differs only for edge cases (e.g. Turkish dotless-I, which doesn't apply here); for standard Latin-alphabet English text this produces the same result as locale-neutral lowercasing. Confirmed not a punctuation regex as such — it's a locale tag on `toLocaleLowerCase`. | Cosmetic only. Optionally swap to a `locale`-driven tag (`"pl-PL"` vs `"en-US"`) for correctness/future-proofing, but functionally inert today — not fixed here (outside "trivial one-line" bar was borderline; left to controller's discretion since it's genuinely low-risk either way). |
| `lib/game/resistance-triggers.ts` — `RED_LINES_BY_LEVEL[*].detect` | (b) input-matching on **player** message | Runs on *every* turn via `mergeRedLinesIntoJudge` (`lib/game/psychology/merge-red-lines.ts:11`, called unconditionally in `process-turn.ts:221`, not just as AI-fallback), plus inside `mockPsychJudgeForLevel`/`mockJudgeForLevel` as full fallback when the AI call fails | **Secondary-system degradation, not a hard block.** Since this runs as an *overlay* on top of a (locale-aware) AI judge, English players simply never get the extra red-line emotion bursts/tags this layer adds (Polish-only regexes for `forced_demand`, `honor_wound`, `coward_accusation`, etc.). One exception: the level-1 `verbal_abuse` pattern already includes English profanity (`fuck|shit|moron|retard`), so that one partially works cross-locale today. Downstream: `NEGATIVE_REPUTATION_INCIDENT_TAGS` and `INCIDENT_RUMORS` (see `reputation.ts` finding below) are keyed off these tags, so specific-incident rumor lines effectively never fire for English players — but the AI judge's own emotion deltas still drive core gameplay. | Needs-English-matcher if the specific reaction-tag/rumor system is considered important to preserve per-locale; otherwise document as known secondary-feature gap (recommended, since translating ~9 regex definitions accurately is real work, not trivial). |
| `lib/game/flattery-triggers.ts` — `HOLLOW_FLATTERY_PATTERNS`, `GENUINE_WARMTH_PATTERNS` | (b) input-matching on player message | Same overlay pattern as above (`detectHollowFlattery` called directly in `process-turn.ts` and `engine.server.ts`, not gated behind AI failure) | Same as above — `hollow_flattery` reaction tag / associated reputation penalty never triggers for English players via this heuristic. AI judge may still penalize insincere flattery on its own judgment, but the specific streak-tracking mechanic (`FLATTERY_SENSITIVITY`, streak counting) is inert for English. | Needs-English-matcher, not trivial (12 regex patterns per bucket) — documented as known gap. |
| `lib/game/reputation-triggers.ts` — `POSITIVE_LINES_BY_LEVEL[*].detect` | (b) input-matching on player message | Same overlay pattern; drives `REPUTATION_TAG_DELTAS` reputation-trait changes and `POSITIVE_REPUTATION_PRAISE` rumor selection | Positive reaction tags (`gentle_story`, `fair_bargain`, `honor_recognition`, etc.) essentially never fire for English input, so the specific-praise rumor lines in `POSITIVE_REPUTATION_PRAISE` (below) rarely trigger for English players. Renown/trait drift from this path is muted but not zero (AI-judge-driven `goalProgressDelta`/emotion deltas still move `traits` indirectly through gameplay outcomes). | Needs-English-matcher, not trivial — documented as known gap, same as red-lines. |
| `lib/game/reputation-triggers.ts` — `POSITIVE_REPUTATION_PRAISE` (lines 211-222) | **(a) DISPLAY MISS** — should have been Task 11 | Rumor-line text shown to the player at the start of a later level (`formatRumorForDisplay`, `conversation-greetings.ts:90`, `engine/snapshot.ts:37`) | Real display gap, but rarely reached for English players precisely *because* the positive-line detectors above never tag it in English — so it's a latent bug more than an active one today. | Not fixed — flagged. ~10 short strings. |
| `lib/game/reputation.ts` (not in original brief, found via trace) — `INCIDENT_RUMORS` (56-405), generic renown-threshold rumor fallbacks (432-447), `REPUTATION_INCIDENT_LABELS` (456-468) | **(a) DISPLAY MISS** — should have been Task 11 | All are `rumorLine` display strings shown to players via `buildRumorLine` → `formatRumorForDisplay`/`getConversationGreeting` | Same latency caveat as above for the tag-keyed rumors, but the **generic renown-threshold fallback rumors** (lines 432-447, e.g. `"Plotka: mówią, że ten podróżnik lubi rozkazywać i naciskać."`) key off `traits.pressure/warmth/arrogance/respect/cunning` which *are* meaningfully populated for English play (via AI-judge-driven trait updates elsewhere), so these 6 generic lines **will** show Polish text to English players in normal play. | Not fixed — flagged as the second-most player-visible gap after the level-opening greetings. ~20 strings total in this file. |
| `lib/game/psychology/mock-psych-character.ts` — `RESISTANCE`, `WARM_NEUTRAL`, `CRACK` (lines 7-30) | **(a) DISPLAY MISS** — should have been Task 11 | Character dialogue fallback used whenever `generatePsychCharacterReplyWithAi` returns null (AI call failure/outage) — `process-turn.ts:385-392` | Only triggers on AI-provider failure (all configured providers down/erroring), not routine play — but when it does trigger, English players briefly see full Polish character dialogue mid-conversation. | Not fixed — flagged, ~16 strings, needs voice-matched English translation. |
| `lib/game/psychology/mock-psych-judge.ts` — `memoryPatch` template strings | Mixed: English sentence shells already (good), but interpolate Polish `label` fields from `resistance-triggers.ts`/`reputation-triggers.ts` (e.g. `"Player hit a red line: Bezpośredni rozkaz, Obraźliwe słowa."`) | Internal `psychState.relationshipSummary` text fed back into future AI prompts (`buildPsychJudgePrompt`, `lib/ai/psych-prompts.ts:62`), not directly player-facing today (need to confirm no debug UI surfaces it) | Low direct player impact, but the Polish `label` values leak into an English-templated sentence that is itself later fed back into the LLM prompt as conversational memory — a minor prompt-quality issue for the persuasion judge, not a blocker. | Needs-English-matcher for the `label`/`playerHint` fields in `resistance-triggers.ts`/`reputation-triggers.ts` if this is judged worth fixing; otherwise document as known gap. |
| `lib/game/objectives.ts` — `buildTargetUtteranceFallback` (lines 120-141) | **(a) DISPLAY MISS** — should have been Task 11 | Character dialogue used when `TARGET_UTTERANCE` objective is completed via the *readiness-based fallback* (`readiness >= 78`, a designed game mechanic, not an error path) — `process-turn.ts:477-480`, `engine.server.ts:844-847` | **Regularly reachable in normal play**, not just on AI failure — this is a deliberate design fallback to guarantee completion at high readiness. English players hitting this path see Polish victory dialogue. | Not fixed — flagged, 7 templates (one per level), needs voice-matched translation. |
| `lib/game/engine.server.ts`/`lib/game/engine/mock-judge.ts` — `mockJudgeForLevel`, `mockCharacterMessage`, `safeFallbackMessage` | (a) DISPLAY MISS, but **effectively dead code today** | Same fallback role as the `mock-psych-*` equivalents, but only reached when `PSYCH_ENGINE_ENABLED !== "true"` (`lib/game/psychology/config.ts:1-3`). Current `.env.local` and `.env.local.example` both set `PSYCH_ENGINE_ENABLED=true`, so this whole legacy branch of `engine.server.ts` (lines ~687-854) is not exercised in the configured environment. | None today, given current config; would matter only if `PSYCH_ENGINE_ENABLED` were ever turned off. | Not fixed — flagged as lower priority than the psych-engine equivalents since it's config-gated off. |
| `lib/game/psychology/process-turn.ts` — local `safeFallbackMessage` (lines 516-521) | **(a) DISPLAY MISS** — should have been Task 11 | Used when `rejectEarlyTarget` (player said the target phrase too early) or `forbiddenDirectReveal` triggers (`process-turn.ts:474-484`) — both are normal-play situations, not error paths | Real, reachable in normal play. | Not fixed — flagged, 2 strings. |
| `lib/game/engine/mock-judge.ts` — `mockCharacterMessage`/`safeFallbackMessage` full dialogue tables | (a) DISPLAY MISS (legacy) | Same content duplicated for the legacy (non-psych) engine path | See "effectively dead code" note above | Not fixed — flagged, lower priority. |
| `lib/ai/objective-completion-prompts.ts` — `milaStrictRules`, `sageStrictRules`, `kingStrictRules`, `knightStrictRules`, `orcStrictRules`, `godStrictRules` few-shot examples | (b) Polish few-shot examples inside an otherwise-English prompt, fed to the objective-completion AI judge (`lib/ai/objective-completion-judge.ts`) | Judge instructions for `evaluateObjectiveMetWithAi`, not locale-gated (no `locale` param anywhere in this call chain) | **Assessed, not fixed per instructions.** The surrounding prose (rule descriptions, JSON schema) is entirely English; only the "Examples FALSE/TRUE" lines are Polish quotes. Modern instruction-following LLMs (Gemini/DeepSeek/OpenRouter models used here) generalize well from a few non-English examples when the surrounding rule text is precise English — the risk is reduced judge *consistency*, not comprehension. Given levels 1/3/4/6 don't hard-gate on the strict check (see verdict), and this judge (`aiMet`) is the one part of levels 5/7 that *is* AI-driven, the practical risk is judge confidence/precision drift for English play on levels 5 and 7 specifically, compounding the level-7 blocker above. | Needs-English-matcher (translate the 6 example blocks) — not done here per task constraint (no prompt edits). Recommended as part of the level-7 fix work. |
| `lib/ai/sage-key-guess-prompts.ts` — `recordStoneLocation` fallback string, TRUE/FALSE examples | (b) Polish few-shot examples + Polish fallback canonical-location string (`"Kamień Zapisu spoczywa tam, gdzie trzeci krok biblioteki spotyka cień."`, used only if `hiddenKnowledgeForPrompt` returns empty) | Judge instructions for `evaluateSageKeyGuessWithAi` — separate from the main objective judge, used for the level-5 "guess the Record Stone location" side-mechanic | Same reasoning as above; also not locale-gated. The hardcoded fallback string only matters if `character_config.hiddenKnowledge` is empty in the DB (unverified). | Assessed, not fixed. Same recommendation as above. |
| `lib/ai/psych-prompts.ts` — `buildPsychJudgePrompt` (not in original brief, checked for context) | Locale-neutral prose, **but pulls in Polish content indirectly** via `redLineTagsForPrompt(level.id)` / `positiveTagsForPrompt(level.id)` (`resistance-triggers.ts`/`reputation-triggers.ts` `label`/`playerHint` fields) | Turn-level AI judge prompt (`evaluateTurnWithPsychAi`) | The instructional wrapper is English; the injected red-line/positive-line descriptions (used to tell the judge what *would* count as a red line / positive line for this character) are Polish. Same "few-shot in Polish, wrapper in English" pattern as the objective-completion prompts — same low-but-nonzero risk to judge quality/consistency in English play. | Not fixed — noted as an additional instance of the same known pattern the brief asked about, surfaced because `buildPsychJudgePrompt` is on the direct call path of every turn. |

## Inline fixes made

**None.** Every genuine Task-11-scope display-text miss found (`conversation-greetings.ts`
greeting tables, `reputation.ts`, `reputation-triggers.ts` praise map,
`mock-psych-character.ts`, `objectives.ts` fallback templates,
`process-turn.ts`'s local `safeFallbackMessage`) requires translating multiple
voice-matched dialogue/flavor strings (roughly 60-70 strings in total across all
files), not a one-line change, so per the task's constraint they are documented
here rather than fixed. The one item that was borderline-trivial
(`speech-plan.ts`'s hardcoded `"pl-PL"` locale tag) was left alone too, since it's
confirmed functionally inert for English text and changing it carries a small risk
of behavior drift in `preservesDisplayWords` for no measurable benefit.

## Summary of recommended follow-up work, in priority order

1. **Fix the level-7 (God) completion blocker.** Either thread `locale` into
   `evaluateObjectiveMet`/`combineObjectiveMetJudges` so `locale==="en"` treats
   level 7 like the other AI-only levels, or write an English `godConcessionMet`.
   This is the only finding in this audit that can make a level literally
   unwinnable in English.
2. **Verify level-5 DB config** (`game_levels.objective_config.acceptedRevealVariants`,
   `character_config.hiddenKnowledge.revealKeywords` for the Sage level) is
   translated to English; if not, level 5 has the same failure mode as level 7.
3. **Translate `conversation-greetings.ts`'s greeting/callback tables and
   `reputation.ts`'s rumor/incident-label tables** — these are the two most
   player-visible Polish-text leaks in English play (every level's opening line;
   recurring renown-based rumor flavor text).
4. **Translate the psych-engine fallback dialogue** (`mock-psych-character.ts`,
   `objectives.ts`'s `buildTargetUtteranceFallback`, `process-turn.ts`'s local
   `safeFallbackMessage`) — reachable in normal play (design fallback + AI-outage
   fallback), lower frequency than #3 but still real.
5. **Lower priority / optional:** translate the red-line/positive-line/flattery
   trigger-word lists and the AI-judge few-shot examples for full parity; these
   degrade secondary flavor systems and judge consistency but don't block core
   gameplay given the AI-judge-primary architecture confirmed in the verdict
   above.
6. **Not urgent:** `lib/game/engine/mock-judge.ts` and its legacy dialogue tables
   are dead code while `PSYCH_ENGINE_ENABLED=true`; low priority unless that flag
   is ever flipped.
