# Slajdy zakończenia (po wygranej z Bogiem)

Komponent jak intro: pełnoekranowy obraz + karta tekstu. **5 slajdów.** Muzyka: crossfade z `god-fractures` → spokojny loop / cisza.

---

# Slajdy zakończenia (po wygranej z Bogiem)

Komponent jak intro: pełnoekranowy obraz + karta tekstu. **5 slajdów.** Muzyka: crossfade z `god-fractures` → spokojny loop / cisza.

---

## Slajd 1 — Siedmiu Świadków

| Pole | Wartość |
|------|---------|
| **Obraz** | `/narrative/ending/01-seven-voices.webp` |
| **Prompt art** | Siedem sylwetek (Mila, Handlarz, Rycerz, Ork, Mędrzec, Król, Bóg) w półkolu, plecy do Wędrowca, mistyczne światło |
| **Tytuł** | Siedmiu Świadków |
| **Main** | Katastrofa "Pękniętego Nieba" nie była karą z niebios. Była po prostu kłamstwem. Kłamstwem, za które kupiono Handlarza, do którego zmuszono Rycerza, o które oskarżono Orka i które spalił Mędrzec. |
| **Support** | Nie pokonałeś ich. Każde z nich zdecydowało się wreszcie przestać chronić tę zepsutą tajemnicę. |

**Wariant bogaty** (gdy `discoveredFragments.length >= 6`):  
Support rozszerzone o jedno krótkie zdanie per postać (max 7 linii w support — scroll na mobile).

**Wariant skromny** (< 6 fragmentów): tylko main + support jak wyżej.

---

## Slajd 2 — Bóg, który słuchał

| Pole | Wartość |
|------|---------|
| **Obraz** | `/narrative/ending/02-god-whispers.webp` |
| **Prompt** | Głębia, światło jak oddech, bez piorunów, asset bliski `god_fractures` |
| **Tytuł** | Bóg, który słuchał |
| **Main** | Gdy stajesz przed Bogiem Milczenia, rozumiesz swój błąd. Bóg nie ukradł ludziom prawdy. Bóg jest tylko naczyniem. Przyjął ciężar prawdy, bo ludzie błagali go o to, zbyt przerażeni konsekwencjami własnych słów. |
| **Support** | Milczenie nie było karą. Było tchórzostwem królestwa, które nie potrafiło udźwignąć "Pękniętego Nieba". |

**Wariant renomy (pressure wysoka):**  
Support alternatywny: *„Nauczyłeś ich mówić — ale czy sam nie traktujesz słów jak miecza?”*

---

## Slajd 3 — Imię Wędrowca

| Pole | Wartość |
|------|---------|
| **Obraz** | `/narrative/ending/03-chronicle-name.webp` |
| **Prompt** | Otwarta księga, pusta strona zaczyna świecić; sylwetka Wędrowca |
| **Tytuł** | Imię Wędrowca |
| **Main** | Twoja Kronika była pusta, bo nie miałeś własnych tajemnic. Dlatego mogłeś ich wysłuchać. Bóg nie daje Ci magii, daje Ci prawo do imienia. Zwraca światu wolną wolę. |
| **Support** | Zdejmujesz klątwę "Pękniętego Nieba". Udowadniasz, że ludzie są gotowi znów przyjąć ciężar prawdy. |

**Wariant `display_name`:** jeśli gracz ma nick w profilu, support: *„Na stronie pojawia się: {display_name}.”*  
**Wariant bez nicku:** imię pozostaje abstrakcyjne — „Wędrowiec”.

---

## Slajd 4 — Konsekwencje

| Pole | Wartość |
|------|---------|
| **Obraz** | `/narrative/ending/04-world-lights.webp` |
| **Prompt** | Kolaż: sad, targ, zbroja, ognisko, biblioteka, tron — każde miejsce jaśniejsze |
| **Tytuł** | Konsekwencje |
| **Main** | Prawda nie uzdrowiła świata w jeden dzień. Zrozumienie winy Króla nie cofnęło krzywd wyrządzonych Orkom. |
| **Support** | Ale odtąd nikt nie musi już milczeć za innych. Bramy są otwarte. Ludzie sami wezmą odpowiedzialność za swoje słowa. |

**Odpowiedzialność, nie rozgrzeszenie:** w wariancie pełnej Kroniki dodać zdanie:

> Król otworzył bramę, lecz jego rozkaz nie przestał być winą. Świadectwo Orka wróciło do Kroniki pod jego własnym imieniem.

## Slajd 5 — Ostatnie słowo

| Pole | Wartość |
|------|---------|
| **Obraz** | `/narrative/ending/05-road-dawn.webp` |
| **Prompt** | Ta sama droga co na mapie/intro, wschód słońca, plecy Wędrowca |
| **Tytuł** | Droga |
| **Main** | Nie potrzebowałeś miecza. Potrzebowałeś odwagi, by słuchać — i odpowiedzialności za słowa, które niosłeś dalej. |
| **Support** | Opowieść domknięta. Milczenie oddane. Droga zostaje. |

**Przycisk końcowy:** „Wróć na mapę” / „Zakończ”

---

## Implementacja

```ts
type EndingSlide = {
  image: string;
  title: string;
  main: string;
  support: string;
  supportVariant?: {
    highPressure?: string;
    fullChronicle?: string;
    hasDisplayName?: string;
  };
};
```

Wybór wariantu w `EndingSlides` na podstawie:
- `playerLoreState.discoveredFragments.length`
- `reputation.traits.pressure`
- `profile.display_name`

---

## Skip

Przycisk „Pomiń epilog” — jak intro (Escape).

Po slajdach: `PATCH endingSeen: true`.
