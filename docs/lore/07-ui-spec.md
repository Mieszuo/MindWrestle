# Spec UI fabularnego

---

## 1. Ekran po ukończeniu poziomu (`StoryBeatScreen`)

### Kiedy
- **Pierwsze** ukończenie poziomu (`completed_attempts_count === 0` przed merge).
- Po decyzji objective completed i wypowiedzi `completionReveal` przez NPC, **przed** `VictoryModal`.

### Layout (desktop)
Pełny viewport — wzorzec jak intro:
- **Tło:** obraz fabularny (`object-fit: cover`, vignette).
- **Karta** (lewy dół lub lewa połowa, max ~480px): pergamin.

### Zawartość karty (kolejność)

1. **Eyebrow:** `Fragment Kroniki · {numer}/7`
2. **Tytuł:** np. „Drugie Milczenie: Cena”
3. **completionReveal** — 2–4 zdania (emocjonalny reveal)
4. **Sekcja „Prawda o {postaci}”** — 1 zdanie (`characterTruth` skrót z matrycy)
5. **Sekcja „Wskazówka”** — `nextLevelClue` w kursywie / inset
6. **Przycisk:** „Kontynuuj” → VictoryModal

### Mobile
Obraz ~55vh u góry, karta scrollowalna na dole.

### Replay
Przycisk „Pomiń” lub automatyczne przejście do VictoryModal po 0.5s z opcją „Pokaż fragment” w Kronice.

### Reduced motion
Bez blur animacji; crossfade 0.25s.

---

## 2. VictoryModal — wynik dopiero po fabule

Po StoryBeat — statystyki, ranking, renoma, „Następny poziom”.

**Zasada:** po pierwszym ukończeniu poziomu StoryBeat zawsze poprzedza statystyki. Nie przechodzić bezpośrednio z ostatniej emocjonalnej odpowiedzi postaci do czasu, rankingu i rangi rozmowy.

Pod quote dodać link: „Otwórz wpis w Kronice”.

---

## 3. Kronika (mapa + w rozmowie)

### 3.1 ChroniclePanel (mapa)

**Wejście:** przycisk „Kronika” w MapUi (obok renomy / ustawień).

**Struktura:**
```text
Kronika Drogi
├── Postęp: ●●●○○○○ (7 kółek)
├── Wpisy (reverse chronological lub 1→7)
│   └── [karta] tytuł + narrativeText + clueText + miniatura
└── Pusty slot: „Milczenie jeszcze nie oddane” (locked)
```

Klik wpisu: modal z pełnym tekstem + obrazem (jeśli jest).

### 3.2 Zapis rozmowy a Kronika

Sekcja zawierająca wiadomości NPC, gracza i podszepty nosi nazwę **Zapis rozmowy**, nie „Kronika”.

**Kronika** jest osobnym dziennikiem prawd odblokowanych między poziomami. Nazwy nie mogą być używane zamiennie.

### 3.3 Kronika w rozmowie (Etap 2)

Drawer / zakładka „Kronika” w `ConversationParchment`:
- tylko **odblokowane** fragmenty,
- sekcja „Wskazówki” = suma `nextLevelClue` z poprzednich poziomów relevantnych do bieżącego,
- **read-only** — gracz kopiuje sens do wiadomości ręcznie (nie auto-insert).

---

## 4. Margines Kroniki — coaching podczas rozmowy

Pełna specyfikacja: [../engine/coaching-system.md](../engine/coaching-system.md).

Wpis Marginesu pojawia się pod odpowiedzią postaci i pozostaje w Zapisie rozmowy. Krótki toast może jedynie sygnalizować, że pojawiła się nowa interpretacja.

Format:

```text
Margines Kroniki
{co postać poczuła}
{co w ostatnim ruchu to wywołało}
{jaki kierunek warto rozważyć}
```

Przycisk **„Poproś o podszept”** znajduje się przy polu wiadomości lub w nagłówku Zapisu rozmowy. Tryb pomocy: subtelny / standardowy / wyraźny.

Startowe opisy nastroju muszą być neutralne. Przed pierwszą wiadomością nie wyświetlać diagnoz typu „tracisz uwagę”, „zaraz przerwie” ani „nie widzi sensu”.

---

## 5. Mapa — wskazówki

Przy **następnym** odblokowanym poziomie (hover / panel wyboru):

```text
Wskazówka z Kroniki:
„Honor nie otworzy Rycerza. Obowiązek może.”
```

Źródło: `nextLevelClue` z ostatniego ukończonego poziomu.

Przy **ukończonym** pinie:
```text
✓ Przekonano · Fragment: Cena Ciszy
[Otwórz Kronikę] [Zagraj ponownie]
```

---

## 6. Briefing Króla (poziom 6, Etap 2)

Modal / ekran przed startem próby (tylko pierwsza wizyta lub zawsze — rekomendacja: **zawsze skippable**):

**Tytuł:** Świadectwa drogi

**Lista (auto z Kroniki 1–5):**
- Mila — sad, srebrny owoc, dług Handlarza
- Handlarz — cena ciszy
- Rycerz — przysięga zbyt dosłowna
- Ork — Pęknięte Niebo
- Mędrzec — popiół kroniki

**Disclaimer:**
> Nie musisz cytować tego wprost — ale Król słucha argumentów zbudowanych z drogi, nie pustych próśb.

Checkbox: „Nie pokazuj ponownie” (localStorage).

---

## 7. Intro fabularne (osobny PR)

Intro powinno pokazać inciting incident z [02-wanderer.md](./02-wanderer.md): Wędrowiec znajduje pustą Kronikę z pierwszym zdaniem prowadzącym do Mili.

Pełny wariant pięciu slajdów znajduje się w [10-copy-inventory.md](./10-copy-inventory.md). Pierwszy lub drugi slajd musi odpowiedzieć na pytanie: **dlaczego Wędrowiec rozpoczyna tę drogę właśnie teraz?**

---

## 8. Ending slides

Patrz [08-ending-slides.md](./08-ending-slides.md). Ten sam komponent co intro (`EndingSlides`), inna tablica slajdów.

Flow: Bóg wygrany → EndingSlides (5) → ekran „Opowieść domknięta” → mapa (jaśniejsza?) lub credits.

---

## 9. Assety — konwencja ścieżek

```text
public/narrative/beats/01-mila-silver-fruit.webp
public/narrative/beats/02-merchant-debt-book.webp
...
public/narrative/beats/07-god-seven-fragments.webp
public/narrative/ending/01-seven-voices.webp
...
```

Format: WebP, ~1920×1080, spójny styl z intro slides.

Do czasu assety: fallback gradient + siluet postaci z `/characters/*.png`.

---

## 10. Dostępność

- StoryBeat i Ending: `aria-live="polite"`, focus trap w karcie.
- Kronika: wpisy jako lista `<article>`.
- Podszepty Marginesu: trwałe wpisy w Zapisie rozmowy; toast nie może być jedynym nośnikiem informacji.
- Obrazy dekoracyjne: `alt=""` + tekst w karcie.
