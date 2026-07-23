# Audyt i projekt modelu płatności — ConvinceMe / MindWrestle

Data: 2026-07-20. Status: **propozycja do zatwierdzenia** (nic z tego dokumentu nie jest jeszcze wdrożone).

Zakres: audyt obecnego billingu (pakiety podejść + Stripe + wallet), ekonomia jednostkowa (koszty API rosną z użyciem), projekt docelowego modelu płatności: uczciwego dla gracza, rentownego i mierzalnego.

---

## 1. Jak jest dzisiaj (stan faktyczny z kodu)

**Model:** jednorazowe pakiety podejść (attempt packs), bez subskrypcji.

| Pakiet | Cena | €/podejście |
|---|---|---|
| 5 podejść | €2.99 | €0.598 |
| 15 podejść | €6.99 | €0.466 |
| 40 podejść | €14.99 | €0.375 |

- 3 darmowe podejścia/miesiąc globalnie (`FREE_ATTEMPTS_PER_MONTH`, fallback 3).
- Limit 25 wiadomości gracza na podejście (`MAX_USER_MESSAGES_PER_ATTEMPT`).
- Konsumpcja: najpierw darmowe, potem płatne — atomowo w Postgresie (`consume_attempt_credit`, `FOR UPDATE`, RLS). **Solidne.**
- Księga (`attempt_ledger`) + wallet + idempotencja webhooka po `stripe_event_id` i `checkout_session_id`. **Solidne.**
- Telemetria LLM w `ai_usage_events` z `cost_usd` (DeepSeek $0.14/$0.28 za 1M; Gemini $0.15/$0.60) + panel `/admin`. **Dobry fundament mierzalności.**

**Koszty na turę gracza (silnik psych):** 2 wywołania LLM (psych_judge + psych_character) + warunkowo 3. (objective judge, gdy wygrana jest matematycznie możliwa) + **TTS ElevenLabs do 800 znaków na odpowiedź NPC** + STT przy wejściu głosowym.

## 2. Ekonomia jednostkowa (lipiec 2026)

Ceny dostawców: DeepSeek v4-flash $0.14/M in (cache miss; hit $0.0028/M), $0.28/M out; ElevenLabs API ~$0.10/1000 znaków (v3/multilingual), ~$0.05/1000 (Flash v2.5).

**Podejście tekstowe** (śr. 15 tur, ~3.5–5k tokenów promptu/wywołanie):
- LLM ≈ **$0.02–0.04** → marża na pakietach 92–96%. ✅

**Podejście głosowe** (15 tur × ~400 znaków TTS = 6 000 znaków):
- TTS ≈ $0.60 + LLM ≈ **$0.62 (~€0.57)**.
- Przychód: €0.60 (pakiet 5) / €0.47 (pakiet 15) / €0.37 (pakiet 40).
- **Wynik: od zera do −€0.20 na podejściu — głos konsumuje całą marżę.** ❌
- Skrajnie (25 tur × 800 znaków): $2.00+ kosztu przy €0.37–0.60 przychodu.

**Prowizje Stripe** (EU: 1.5% + €0.25): €2.99 → ~10% ceny; €6.99 → ~5%; €14.99 → ~3%. Mały pakiet jest drogi w obsłudze.

**Darmowi użytkownicy:** 3 podejścia/mies. × do ~$0.6/podejście z głosem = niekontrolowany koszt akwizycji; tekstowo — grosze. 

**Wniosek:** model pakietów jest zdrowy dla trybu tekstowego; **jedyny realny problem ekonomiczny to nielimitowany głos ElevenLabs** oraz dziury niżej.

## 3. Audyt — znaleziska

### P0 — błędy do naprawy przed sprzedażą
1. **Duplikat price ID:** `STRIPE_PRICE_ATTEMPTS_40` = ten sam price co `ATTEMPTS_5` (env). Skutek: gracz klika „40 podejść €14.99", Stripe pobiera cenę z price'a 5-paka (€2.99), a fulfillment (`packForPriceId`) rozpoznaje line item jako pakiet 5 i **zapisuje 5 podejść**. Scenariusz „czuję się oszukany" w czystej postaci. Fulfillment w ogóle nie porównuje `metadata.packId` z line itemem.
2. **Brak obsługi płatności asynchronicznych:** webhook przetwarza tylko `checkout.session.completed` z `payment_status === "paid"`. Dla BLIK/P24 (kluczowe dla polskich graczy) sukces przychodzi w `checkout.session.async_payment_succeeded` — **gracz płaci, kredyty nigdy nie wpadają**. Brak też `charge.refunded` (zwrot pieniędzy nie zdejmuje podejść) i obsługi disputes.
3. **Endpoint TTS jako darmowe proxy ElevenLabs:** `/api/game/tts` przyjmuje dowolny tekst ≤800 znaków; `attemptId` jest opcjonalny i **niewalidowany** (ani własność, ani status, ani zgodność tekstu z repliką NPC). Rate limit 20/min jest **in-memory** — na serverless per-instancja, praktycznie miękki. Zalogowany użytkownik może generować ~$90+/h kosztów na Twoim kluczu. Analogicznie STT.
4. **Baza produkcyjna nie istnieje** (osobna diagnoza z 2026-07-20): projekt Supabase `sclkullmsikzjnpavtfk` → NXDOMAIN; „failed to fetch" na produkcji. Billing nie zadziała, dopóki baza nie wróci.
5. **Klucze testowe vs live:** `.env.local` ma `sk_test_…`; podpięty do sesji Stripe MCP wskazuje inne konto („MamiGlide"). Przed startem sprzedaży: potwierdzić właściwe konto Stripe ConvinceMe, klucze live na Vercelu, webhook secret produkcyjny.

### P1 — uczciwość wobec gracza (dziś gracz może czuć się oszukany)
6. **Podejście spala się przy otwarciu poziomu** (`startAttempt` → `consume_attempt_credit`), nie przy pierwszej wiadomości. Wejście przez pomyłkę / crash przeglądarki / brak czasu = stracony kredyt.
7. **Zero ścieżki zwrotu:** źródło `adjustment` istnieje w schemacie ledgera, ale **nigdzie nie jest używane**. Awaria AI (5xx), padnięta baza, timeout — podejście przepada bez rekompensaty.
8. **Cicha degradacja do mocka:** gdy LLM padnie, silnik przechodzi na deterministyczny mock — gracz płaci za „rozmowę z AI", dostaje skrypt i nie jest o tym informowany, a próba liczy się normalnie.
9. **Ceny w UI hardcodowane** (`displayPrice: "€2.99"`) bez weryfikacji z faktycznym Price w Stripe — rozjazd = oszukany klient (patrz pkt 1). Brak prezentacji w PLN dla polskich graczy (EUR w checkout = niepewność kursowa).
10. **`STRIPE_AUTOMATIC_TAX=false`** — sprzedaż cyfrowa konsumentom w UE wymaga VAT/OSS. Ryzyko prawne, a późniejsze doliczenie VAT do cen = „podwyżka".
11. Rozjazd env: kod czyta `FREE_ATTEMPTS_PER_MONTH`, w `.env.local` zostały stare `FREE_LEVEL_1_ATTEMPTS_PER_MONTH` / `FREE_LEVEL_2…` — limit działa z fallbacku; konfiguracja jest myląca.

### P1 — mierzalność (dziś nie policzysz marży)
12. **TTS/STT logowane z `cost_usd: null`** — najdroższy składnik nie ma wyceny; panel admina pokazuje koszty LLM, ale nie głosu.
13. Brak widoku **marża = przychód (ledger `paid_pack` × cena pakietu) − koszt (`ai_usage_events`)** per użytkownik / per podejście / per poziom.
14. Brak progów i alertów: koszt/podejście p95, dzienny koszt darmowych kont, dzienny koszt pojedynczego użytkownika, globalny dzienny budżet API (kill-switch).

## 4. Projekt docelowy — 3 warianty

### Wariant A — pakiety podejść, utwardzone (REKOMENDOWANY)
Zostaje obecny model mentalny („kupuję N rozmów"), ale z bezpiecznikami:
- **Kredyt pobierany przy pierwszej wiadomości gracza**, nie przy otwarciu poziomu.
- **Auto-zwrot (`adjustment` +1)**, gdy: podejście umarło z powodu 5xx/awarii przed 3. wiadomością, silnik przeszedł na mocka w trakcie płatnego podejścia, albo admin uzna reklamację. Zasada komunikowana wprost: „Nie płacisz za nasze błędy".
- **Budżet głosu w podejściu:** np. 2 000 znaków TTS (≈5 replik) wliczone; po wyczerpaniu — napisy (tekst) + pasek „głosu" w HUD. Poziomy 1–5 na ElevenLabs Flash v2.5 ($0.05/1k), v3 tylko dla momentów fabularnych/narratora. Koszt podejścia spada do ≤ €0.20 → marża 45–65% nawet na pakiecie 40.
- Ceny: bez zmian (5/15/40), środkowy pakiet jako kotwica „najlepszy stosunek"; **prezentacja w PLN** (Stripe adaptive pricing / jawne ceny PLN); VAT automatic tax włączony.
- Paywall z zasadami fair-play: kiedy podejście się liczy, limit wiadomości, budżet głosu, auto-zwroty. Licznik wiadomości i głosu widoczny w HUD w trakcie gry.

*Zalety:* najprostszy model dla gracza, minimalne zmiany kodu, marża kontrolowana. *Wady:* budżet głosu trzeba dobrze zakomunikować (inaczej „ucięli mi głos!").

### Wariant B — dwie waluty (podejścia + energia głosu)
Osobny licznik „energii głosowej" kupowany oddzielnie. *Zalety:* pełna kontrola marży, monetyzacja głosu wprost. *Wady:* dwa liczniki = wrażenie skubania (nickel-and-diming), więcej UI/kodu, najwyższe ryzyko poczucia oszukania. **Odradzam jako produkt widoczny** — wariant A realizuje to samo jako niewidoczny wewnętrzny limit.

### Wariant C — subskrypcja / Season Pass
Miesięczny abonament: pula podejść + pełny głos + bonusy fabularne (kronika, epilogi). *Zalety:* przewidywalny przychód, naturalny dla „map i powrotów". *Wady:* gra sesyjna z nieregularnym użyciem → churn i refundy; Stripe Billing + VAT recurring = złożoność; przy obecnej skali przedwczesne. **Rekomendacja: wrócić do tego po potwierdzeniu retencji** (np. „Season Pass" przy sezonowych rozszerzeniach lore).

**Rekomendacja: A teraz, C jako opcja przyszłościowa, B nigdy jako widoczna mechanika.**

## 5. Mierzalność (definicja „działa")

Metryki (dzienny cron + widok w /admin):
- **Koszt/podejście** p50/p95, z podziałem LLM vs głos (wymaga wyceny TTS/STT w `cost_usd`: TTS = znaki × $0.10/1k lub $0.05/1k wg modelu; STT wg cennika Scribe).
- **Marża/pakiet:** przychód z ledgera (`paid_pack` +N × cena) − suma kosztów podejść płatnych.
- **Konwersja:** darmowe→pierwszy zakup; ARPPU; udział głosu w koszcie; odsetek podejść zakończonych limitem tur; odsetek auto-zwrotów.
- **Guardraile:** alert gdy koszt darmowego konta > $0.50/dzień; użytkownik > $3/dzień; globalny dzienny budżet API z kill-switchem (env) degradującym do tekstu/mocka.

## 6. Plan poprawek (kolejność wdrożenia)

**Etap 0 — reanimacja produkcji (poza tym dokumentem):** przywrócenie/odtworzenie projektu Supabase + env na Vercelu.

**Etap 1 — P0 billing (przed jakąkolwiek sprzedażą):** *(status 2026-07-20: pkt 1–3 zaimplementowane na gałęzi `billing-p0-fixes` — patrz `docs/superpowers/plans/2026-07-20-billing-p0-fixes.md`; wdrożenie czeka na Etap 0 i zadania operatorskie z planu)*
1. ✅ (kod) Weryfikacja `price.unit_amount` vs cena pakietu w `createAttemptPackCheckout` (odmowa przy rozjeździe); w fulfillment krzyżowa walidacja `metadata.packId` ↔ line item. ⏳ (operator) Nowy Price €14.99 w Stripe dla 40-paka + poprawka env.
2. ✅ (kod) Webhook: `checkout.session.async_payment_succeeded` (kredytowanie), `async_payment_failed` (ack), `charge.refunded` → `apply_billing_adjustment` (−N, wallet do 0; częściowe refundy → manual review), `charge.dispute.created` → `freeze_attempt_wallet` (zamrożony wallet nie konsumuje prób). ⏳ (operator) dodać eventy do endpointu webhooka w Stripe.
3. ✅ (kod) TTS: wymagany własny `attemptId` `IN_PROGRESS` + tekst musi być repliką NPC z tej próby; STT (token realtime i fallback POST): wymagany własny `attemptId` `IN_PROGRESS`; trwały dzienny budżet w Postgresie (`consume_voice_quota`: `TTS_DAILY_CHAR_LIMIT`=40k znaków, `STT_DAILY_REQUEST_LIMIT`=200/dzień).
4. ⏳ (operator) Konta/klucze: potwierdzić właściwe konto Stripe, live keys + webhook secret na Vercelu, `STRIPE_AUTOMATIC_TAX=true` po rejestracji OSS.

**Etap 2 — fair play:**
5. Konsumpcja kredytu przy pierwszej wiadomości (przeniesienie `consume_attempt_credit` ze `startAttempt` do pierwszego `sendAttemptMessage`; attempt bez wiadomości = bez kosztu).
6. Auto-`adjustment` +1 przy awarii systemowej (reguły z §4A) + oznaczanie podejść `degraded` przy fallbacku na mocka + informacja w UI.
7. Paywall/HUD: zasady, licznik wiadomości, pasek budżetu głosu; ceny w PLN.

**Etap 3 — ekonomia głosu i metryki:**
8. Budżet głosu per podejście + Flash v2.5 dla poziomów 1–5; wycena TTS/STT w `cost_usd`.
9. Widok marży + alerty + kill-switch budżetowy.
10. Porządki env (`FREE_ATTEMPTS_PER_MONTH`, usunięcie martwych zmiennych).

Każdy etap = osobny branch + testy (TDD dla logiki konsumpcji/zwrotów i webhooków — te ścieżki mają już testowalną strukturę RPC).

---

## Załącznik: źródła cen
- ElevenLabs: [pricing](https://elevenlabs.io/pricing/api), [Eleven v3 cost help](https://help.elevenlabs.io/hc/en-us/articles/35869113958801-How-much-does-it-cost-to-generate-using-Eleven-v3)
- DeepSeek: [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/), [OpenRouter v4-flash](https://openrouter.ai/deepseek/deepseek-v4-flash)
