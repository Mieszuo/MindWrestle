# Głos w rozmowie — STT, TTS i emocje

Plan wdrożenia warstwy głosowej nad istniejącym **silnikiem tekstowym**. Sędzia, renoma i psych engine **nie są zastępowane** — gracz i postać komunikują się tekstem; STT/TTS to wejście/wyjście UI.

## Cele

| Warstwa | Cel | Provider |
|---------|-----|----------|
| **STT** (Speech-to-Text) | Gracz mówi szybciej niż pisze | ElevenLabs Scribe |
| **TTS** (Text-to-Speech) | Postać brzmi jak żywa rozmowa; 7 unikalnych głosów | ElevenLabs |
| **Emocje w głosie** | Ten sam głos, inny ton przy niskiej cierpliwości / wysokiej drażliwości | Eleven v3 Audio Tags + `deriveVoiceDelivery()` |
| **Emocje w tekście** | Ostrzejsze/krótsze odpowiedzi przy napięciu | prompty LLM (`character-speech.ts`) |

## Architektura

```text
Gracz ──[mikrofon]──► Scribe Realtime (WebSocket) ──► tekst na bieżąco w polu
                                                          │
                                                          ▼
                                              POST /api/game/attempts/.../messages
                                              (engine.server — bez zmian logiki)
                                                          │
                                                          ▼
                                              odpowiedź postaci (tekst) + emotionState + responseMode
                                                          │
                                                          ▼
                                              POST /api/game/tts (ElevenLabs + voice delivery)
                                                          │
                                                          ▼
                                              AudioProvider.playSpeech()
```

Klucz API **tylko na serwerze** (`ELEVENLABS_API_KEY`). Jeden klucz obsługuje STT i TTS.

## Ustawienia gracza (localStorage)

| Klucz | Domyślnie | Opis |
|-------|-----------|------|
| `mindwrestle.audio.voiceEnabled` | `true` | TTS odpowiedzi postaci |
| `mindwrestle.audio.sttEnabled` | `true` | przycisk mikrofonu |
| `mindwrestle.audio.sttAutoSend` | `false` | `true` = wyślij od razu po STT; `false` = wstaw tekst w pole |
| `mindwrestle.audio.voiceVolume` | `0.85` | głośność głosu postaci |

Panel gracza → zakładka ustawień dźwięku (obok muzyki/SFX).

## STT — tryb wysyłki

- **Potwierdzenie manualne (domyślnie):** mówisz → słowa **na bieżąco w polu input** → po chwili ciszy nagrywanie się kończy → edytujesz → Wyślij.
- **Auto-wysyłanie:** to samo, ale po ciszy wiadomość **wysyła się automatycznie**.

Nagrywanie: **jeden klik mikrofonu = start**. Tekst pojawia się na żywo (ElevenLabs Scribe Realtime). Po ~1 s ciszy sesja kończy się sama. Drugi klik = przerwanie (tekst zostaje w polu).

## STT — język

ElevenLabs Scribe Realtime **automatycznie wykrywa język** — brak sztywnego `language_code`. Model domyślny: `scribe_v2_realtime` (env: `ELEVENLABS_STT_REALTIME_MODEL_ID`).

## TTS — profile głosu (7 postaci)

Plik: `lib/game/voice-profiles.ts`

Każdy poziom ma bazowy profil (`voiceId`, `modelId`, domyślne `stability` / `similarityBoost` / `speed`).

Voice ID z env (prod):

```env
ELEVENLABS_API_KEY=
ELEVENLABS_STT_MODEL_ID=scribe_v2
ELEVENLABS_STT_REALTIME_MODEL_ID=scribe_v2_realtime
ELEVENLABS_MODEL_ID=eleven_v3
ELEVENLABS_DEFAULT_VOICE_ID=
ELEVENLABS_VOICE_1=   # Mila
ELEVENLABS_VOICE_2=   # Handlarz
# … _3 … _7
```

Bez `ELEVENLABS_API_KEY` STT i TTS są wyłączone (tekst + SFX jak dotychczas). TTS wymaga dodatkowo `ELEVENLABS_DEFAULT_VOICE_ID`.

## TTS — kanoniczny tekst i reżyseria

Każdy fragment mowy ma postać:

```ts
interface SpeechChunk {
  displayText: string; // kanoniczny tekst widoczny w UI
  spokenText: string; // ten sam tekst z tagami i pauzami
  directionSource: "rules" | "ai" | "authored";
}
```

`spokenText` może zawierać wyłącznie:

- wszystkie oryginalne słowa z `displayText`, w tej samej kolejności,
- zatwierdzone Audio Tags,
- `[short pause]` lub `[long pause]`,
- wielokropki, myślniki oraz bezpieczne zmiany interpunkcji.

Nie wolno usuwać, dodawać, zamieniać ani parafrazować słów. Nie wolno dopisywać „hmm”, westchnień
ani innych reakcji jako tekstu; takie efekty wymagają osobnego, zatwierdzonego `reactionSfx`.
Serwer przed syntezą porównuje sekwencję słów `displayText` i `spokenText`.

Tag emocji stoi przed tekstem, ale pauzy umieszczamy po zdaniach. Nie zaczynamy pierwszego fragmentu
od `[long pause]`, ponieważ tekst jest ujawniany w chwili rozpoczęcia odpowiadającego mu audio.

Przykład:

```text
displayText:
Nie sprzedam ci tego za mniej niż pięćset monet. Chyba że masz coś więcej niż puste słowa, wędrowcze.

spokenText:
[mischievously] Nie sprzedam ci tego za mniej niż pięćset monet. [short pause]
[mischievously] Chyba że masz coś więcej niż puste słowa, wędrowcze.
```

## TTS — emocje (`deriveVoiceDelivery` i `buildSpeechChunk`)

Plik: `lib/game/voice-delivery.ts`

Wejście: `levelId`, `EmotionState`, `emotionDelta?`, `responseMode?`

Wyjście: `{ stability, style, speed }` dla ElevenLabs.

Logika:

1. Dla każdego statu poziomu — `getEmotionMoodDisplay()` → najgorszy `danger` (`critical` > `uneasy` > `comfortable`).
2. Preset delivery: comfortable / uneasy / critical (offsety stability, style, speed).
3. Modulator `responseMode`: przełom ma pierwszeństwo przed ogólnym nastrojem, ale nie powoduje zmiany słów.
4. Clamp per postać (Ork może mieć większy `style` niż Mila).

`buildSpeechChunk()` dobiera maksymalnie jeden główny tag na zdanie i najwyżej jedną jawną pauzę
na całą wypowiedź. Gdy tekst ma już wielokropek, pauzę wynikającą z myślnika albo naturalne
zawieszenie, dodatkowy tag pauzy jest pomijany. Profile bazowe: Mila — `softly`,
Handlarz — `amused`, Rycerz — `solemnly`, Ork — `firmly`,
Mędrzec — `thoughtfully`, Król — `authoritatively`, Bóg — `distantly`.

Każda postać ma osobną mapę `responseMode → direction`, więc ten sam stan nie brzmi identycznie:
opór Mili jest ostrożny, Handlarza rozbawiony, Rycerza stanowczy, Orka gniewny, ale kontrolowany,
a Boga odległy. Zmiany emocji poza `responseMode` dodatkowo przełączają ton na cieplejszy,
ostrożniejszy albo bardziej stanowczy.

Model postaci może zwrócić strukturalne `voicePerformance` tylko dla `crack_in_armor` i `full_reveal`.
Nie zwraca tagów ani alternatywnego tekstu. Serwer akceptuje wyłącznie kierunek z zamkniętej listy,
indeksy pauz po zdaniach oraz poziom subtelności. Finałowe, zapisane kwestie i narracja filmowa używają
reżyserii `authored`.

Narrator intro/outro jest osobnym profilem kronikarza. Używa wyłącznie `slowly`, `quietly`,
`softly`, sporadycznie `solemnly` oraz najwyżej jednej pauzy `short`/`long` na slajd.
Kierunek występuje raz na początku całego nagrania, a nie przed każdym zdaniem.

Domyślnie synteza używa `eleven_v3`. Błędy zgodności modelu/głosu `400` i `422` powodują pojedynczy
fallback do `eleven_multilingual_v2` z czystym tekstem bez tagów. Błędy `401`, `402` i `429` nie są
ponawiane drugim modelem.

Chunking: odpowiedź jest dzielona na zdania. Bieżący i kolejny fragment TTS generują się z wyprzedzeniem, a odtwarzane są kolejno (`hooks/use-character-voice.ts`). Tekst postaci odsłania się pełnymi zdaniami w chwili rozpoczęcia odpowiadającego im audio; przy wyłączonym TTS cała wiadomość pojawia się od razu.

Ducking: podczas mowy muzyka sceny płynnie schodzi do około 34% swojej bieżącej głośności i wraca po zakończeniu wypowiedzi. Krótkie opóźnienie powrotu zapobiega „pompowaniu” głośności między zdaniami.

## Emocje w tekście LLM

Plik: `lib/game/character-speech.ts` — `emotionSpeechInstruction(levelId, emotions)`

Dodawane do promptu postaci gdy np. `patience` / `irritation` w strefie `critical`: krótsze, ostrzejsze zdania (bez meta-gry).

Spięte w `lib/game/psychology/process-turn.ts` obok `responseModeInstruction`.

## API

| Endpoint | Body | Response |
|----------|------|----------|
| `POST /api/game/stt/token` | — | `{ token }` (single-use, 15 min) |
| `POST /api/game/stt/usage` | `{ text, attemptId?, levelId? }` | log użycia po sesji realtime |
| `POST /api/game/stt` | `multipart/form-data` pole `audio` | `{ text }` (batch fallback) |
| `POST /api/game/tts` | `{ text, levelId, emotions?, emotionDelta?, responseMode?, voicePerformance?, sentenceIndex, sentenceCount, attemptId? }` | `audio/mpeg` |

Logowanie: `ai_usage_events` z `call_type` `stt` / `tts`, `provider` `elevenlabs`.

## Uprawnienia klucza API (ElevenLabs)

Przy tworzeniu klucza w **Developers → API Keys** włącz minimalnie:

| Uprawnienie | Po co |
|-------------|-------|
| `speech_to_text` | mikrofon gracza (STT) |
| `text_to_speech` | głos postaci (TTS) |
| `voices_read` | odczyt przypisanych voice ID |

Opcjonalnie (nie wymagane przez grę):

| Uprawnienie | Po co |
|-------------|-------|
| `models_read` | przydatne przy debugowaniu listy modeli |
| `speech_history_read` | podgląd historii w panelu ElevenLabs |

**Nie włączaj** zbędnych uprawnień (`voices_write`, `dubbing_write`, `convai_write` itd.) — gra ich nie używa.

Dodatkowe ustawienia klucza:

- **Character limit** — ustaw limit zgodny z budżetem (opcjonalnie).
- **Allowed IPs** — na produkcji (Vercel) whitelist IP bywa trudny (serwerless); zostaw puste albo użyj statycznego egress tylko jeśli masz stałe IP.
- Klucz trzymaj wyłącznie w env serwera (`.env.local`, Vercel Environment Variables) — nigdy w kliencie.

## Pliki w kodzie

| Plik | Rola |
|------|------|
| `lib/game/voice-profiles.ts` | bazowy głos per levelId |
| `lib/game/voice-delivery.ts` | emocje → parametry TTS |
| `lib/voice/elevenlabs.ts` | TTS ElevenLabs |
| `lib/voice/elevenlabs-stt.ts` | STT ElevenLabs Scribe |
| `app/api/game/tts/route.ts` | TTS API |
| `app/api/game/stt/route.ts` | STT API |
| `hooks/use-character-voice.ts` | fetch + kolejka odtwarzania |
| `hooks/use-voice-input.ts` | nagrywanie + STT + auto/manual |
| `components/game/voice-input-button.tsx` | UI mikrofonu |
| `components/audio/audio-provider.tsx` | `playSpeech`, `stopSpeech`, ustawienia |
| `components/game/conversation-parchment.tsx` | integracja STT/TTS |
| `components/game/player-panel.tsx` | ustawienia głosu |

## Kolejność wdrożenia (PR)

### PR1 — TTS postaci ✅ (implementacja)
- voice-profiles, voice-delivery, TTS API
- AudioProvider + useCharacterVoice
- odtwarzanie po odpowiedzi NPC
- `responseMode` w odpowiedzi API (psych path)

### PR1b — emocje głos + tekst ✅
- `emotionSpeechInstruction` w promptach
- `deriveVoiceDelivery` w `/api/game/tts`

### PR2 — STT gracza ✅
- STT API, mikrofon, toggle auto/manual
- ustawienia w panelu gracza

### PR3 — dopracowanie
- ducking muzyki podczas mowy ✅
- równoległe przygotowanie fragmentów TTS + odsłanianie tekstu zdaniami ✅
- testy jednostkowe `voice-delivery` ✅
- opcjonalnie `character_config.tts` w Supabase

## Definition of done (MVP)

- [x] 7 profili głosu (env voice IDs)
- [x] TTS po odpowiedzi NPC (wyłączalne)
- [x] STT → tekst, toggle auto / manual
- [x] Ton głosu zależy od emocji + responseMode
- [x] Muzyka jest przyciszana podczas mowy postaci
- [x] Tekst odpowiedzi odsłania się zdaniami razem z TTS
- [x] Tekst w UI bez zmian (dostępność)
- [x] Klucze server-side, usage logowany

## Ryzyka

| Ryzyko | Mitigacja |
|--------|-----------|
| Zła transkrypcja | domyślnie manual send |
| Latencja STT + LLM + TTS | TTS po zdaniach; spinner „Postać odpowiada…” |
| Koszt ElevenLabs | max długość TTS (np. 800 znaków) |
| iOS Safari MediaRecorder | test webm/opus; fallback komunikat |

## Powiązane dokumenty

- [Silnik gry](./README.md)
- [Psych engine](./psych-engine.md) — `responseMode`
- `lib/game/character-speech.ts` — styl mowy w promptach
- `lib/game/level-emotions.ts` — staty emocji per poziom
