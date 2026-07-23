# System coachingu — Margines Kroniki

System hintów nie powinien podawać rozwiązania ani brzmieć jak walidator formularza. Jego rolą jest interpretowanie sceny jak żywy game master: nazwać reakcję postaci, połączyć ją z ostatnim ruchem gracza i wskazać użyteczny kierunek następnej próby.

Publiczna nazwa systemu: **Margines Kroniki**.
Pojedynczy komunikat: **podszept**.

## Zasada trzech zdań

Każdy podszept odpowiada na trzy pytania:

1. **Co postać właśnie poczuła?**
2. **Co w wiadomości gracza wywołało tę reakcję?**
3. **Jaki rodzaj ruchu warto rozważyć teraz?**

Przykład:

> Duma Rycerza nieco osłabła. Odwołanie do obowiązku nie zabrzmiało jak litość. Spróbuj teraz zapytać, kto obroni zamek, jeśli będzie trwał przy warcie samotnie.

Podszept może mieć dwa zdania, jeśli wszystkie trzy informacje pozostają czytelne. Nie może zawierać gotowej wypowiedzi gwarantującej zwycięstwo.

## Źródła danych

Margines nie wymaga osobnego modelu AI w wersji pierwszej. Składa komunikat z danych, które silnik już posiada:

| Sygnał | Zastosowanie |
|---|---|
| `reactionTags` | co konkretnie zadziałało lub dotknęło red line |
| delta emocji | widoczna reakcja postaci w tej turze |
| `responseMode` | czy pojawiło się pęknięcie w oporze |
| `secretPressure` / `beliefShift` | czy gracz realnie przybliża cel |
| `identityDefense` / `topicAvoidance` | czy dobry ton nadal uderza w złą ranę lub temat |
| `lastCouncilVotes` | fabularny konflikt wewnętrzny postaci |
| historia 3–4 ostatnich tur | powtarzanie strategii i zastój |
| `uses_previous_lore` | sensowne wykorzystanie Kroniki |

Ukrytych wartości liczbowych nie pokazujemy. Tłumaczymy je na język sceny.

## Rodzaje podszeptów

### 1. Potwierdzenie

Pojawia się po pierwszym trafieniu ważnego pozytywnego taga lub wyraźnym wzroście osi celu.

> Handlarz potraktował cię jak partnera, nie petenta. Konkretna ocena wartości dała ci przewagę. Następny ruch oprzyj na warunkach wymiany, nie na prośbie.

Cel: uczyć gracza **co zrobił dobrze**, nie tylko karać błędy.

### 2. Ostrzeżenie

Pojawia się natychmiast po red line albo nagłym wzroście zagrożenia.

> Słowo „słaby” trafiło w ranę Rycerza. Nie odrzuca pomocy — broni obrazu samego siebie. Przywróć mu godność, zanim wrócisz do celu.

Ostrzeżenia omijają zwykły cooldown.

### 3. Zastój

Pojawia się, gdy przez co najmniej trzy tury:

- oś celu prawie nie rośnie,
- gracz powtarza ten sam `messageIntent` lub tag,
- albo poprawia emocje społeczne, ale nie zbliża się do celu.

> Mędrzec lubi twoją cierpliwość, ale rozmowa krąży wokół uprzejmości. Wróć do obrazów, które już podał: kamienia, cienia i trzeciego kroku.

### 4. Przełom

Pojawia się przy zmianie `responseMode` na `crack_in_armor` lub `partial_concession`.

> W Rycerzu ścierają się teraz honor i obowiązek. Nie potrzebuje kolejnego komplementu — potrzebuje sposobu, by przyjąć pomoc bez utraty twarzy.

To najważniejszy podszept. Ma sprawiać wrażenie, że game master czyta scenę, a nie pasek postępu.

### 5. Echo Kroniki

Pojawia się po pierwszym skutecznym użyciu wcześniejszego fragmentu lore.

> Wzmianka o srebrnym owocu zatrzymała Handlarza na dłużej, niż chciał pokazać. Ten ślad łączy cenę z dawnym długiem. Możesz nacisnąć na wartość zobowiązania, ale nie zamieniaj go w szantaż.

### 6. Ratunek na żądanie

Gracz może kliknąć **„Poproś o podszept”**. System wybiera najbardziej użyteczną diagnozę bieżącego stanu.

Ratunek:

- nie zużywa tury,
- nie tworzy gotowej wiadomości,
- może być coraz bardziej bezpośredni przy kolejnych prośbach,
- jest dostępny zawsze w trybie wyraźnym i po wykryciu zastoju w pozostałych trybach.

## Poziomy pomocy

Ustawienie profilu lub menu rozmowy:

| Tryb | Zachowanie |
|---|---|
| **Subtelny** | tylko ostrzeżenia, przełomy i Echo Kroniki |
| **Standardowy** | wszystkie rodzaje; kierunek bez przykładowej konstrukcji argumentu |
| **Wyraźny** | częstszy coaching i jeden konkretny przykład strategii, ale bez gotowej wygrywającej kwestii |

Domyślnie: **Standardowy**.

Zmiana trybu nie wpływa na wynik, ranking ani renomę.

## Prezentacja UX

### Zapis rozmowy

Obecną sekcję rozmowy nazwaną „Kronika” należy przemianować na **Zapis rozmowy**. Kronika to osobny dziennik odblokowanych prawd.

Podszept pojawia się:

- bezpośrednio pod odpowiedzią postaci jako wpis Marginesu,
- w węższej, przygaszonej oprawie,
- z ikoną pióra lub dopisku na marginesie,
- i pozostaje dostępny w historii rozmowy.

Nie powinien być wyłącznie toastem znikającym po dziesięciu sekundach.

### Toast

Krótki toast może sygnalizować nowy podszept, ale:

- ma osobny przycisk zamknięcia,
- kliknięcie całej karty nie zamyka komunikatu,
- nie usuwa wpisu z Zapisu rozmowy,
- nie zasłania celu ani pola wpisywania,
- po kliknięciu przewija do pełnej treści podszeptu.

### Emocje

Nastroje opisują **stan**, Margines tłumaczy **przyczynę i następny kierunek**. Nie powtarzać tego samego copy w obu miejscach.

Stan początkowy musi być neutralny. Przed pierwszą wiadomością nie używać tekstów sugerujących porażkę, takich jak „tracisz uwagę” lub „nie widzi sensu wymiany”.

### Karta postaci

Pole „Aktualny podszept” na karcie powinno pokazywać:

- przed próbą: ogólną strategię startową,
- podczas próby: ostatni aktywny podszept Marginesu,
- po porażce: diagnozę ostatniego przełomu lub błędu.

## Priorytety i rytm

Kolejność:

1. red line / groźba natychmiastowej porażki,
2. przełom,
3. Echo Kroniki,
4. zastój,
5. pozytywne potwierdzenie,
6. ogólna wskazówka startowa.

Nie używać globalnego cooldownu czasowego jako głównej blokady. Rytm jest **turowy**:

- maksymalnie jeden automatyczny podszept po odpowiedzi NPC,
- ostrzeżenie może pojawić się niezależnie od poprzedniej tury,
- tego samego `hintKey` nie pokazywać ponownie bez zmiany stanu,
- ogólny podszept startowy tylko przed pierwszą wiadomością,
- limit pięciu hintów na próbę usunąć albo stosować wyłącznie do niekrytycznych podpowiedzi.

## Kontrakt danych

```ts
type CoachingKind =
  | "confirmation"
  | "warning"
  | "stuck"
  | "breakthrough"
  | "lore_echo"
  | "requested";

type CoachingHint = {
  id: string;
  kind: CoachingKind;
  title: string;
  observation: string;
  interpretation: string;
  direction: string;
  sourceTurn: number;
  relatedTags: string[];
  persistent: boolean;
  priority: number;
};
```

Tekst renderowany:

```text
{observation} {interpretation} {direction}
```

Rozdzielenie pól pozwala później generować warianty tonu, zachowując kontrolę nad tym, czy system nie podaje rozwiązania.

## Macierz per postać

| Postać | Co potwierdzać | Co ostrzegać | Język przełomu |
|---|---|---|---|
| Mila | opowieść, skojarzenie, bezpieczeństwo | rozkaz, pytanie wprost, drwina | Strach słabnie, ciekawość prowadzi ją bliżej wspomnienia |
| Handlarz | konkret, wartość, wiarygodne odejście | błaganie, pusta groźba, naiwne zaufanie | Uczciwość zaczyna przeważać nad chciwością |
| Rycerz | honor, obowiązek, wspólna sprawa | litość, słabość, kpina | Obowiązek daje mu drogę wyjścia z dumy |
| Ork | krótka umowa, odwaga, brak podstępu | dominacja, oskarżenie o tchórzostwo, długa przemowa | Pragmatyzm przebija podejrzliwość |
| Mędrzec | pokorne pytanie, łączenie metafor | pośpiech, żądanie odpowiedzi, pouczanie | Ciekawość otwiera dostęp do zapisu |
| Król | dobro królestwa, dziedzictwo, świadectwa | rozkaz, błaganie, pochlebstwo, obraza | Sumienie zyskuje przewagę nad ego |
| Bóg Milczenia | pokora, odpowiedzialność, przyjęcie niepewności | dominacja, tania pewność, pochlebstwo | Wgląd zbliża się, dystans przestaje chronić ciszę |

## Porażka

Ekran porażki powinien dawać jedną spójną retrospekcję:

1. **Moment zerwania:** co ostatecznie zakończyło rozmowę.
2. **Wzorzec:** jaka strategia prowadziła do problemu.
3. **Nowy plan:** jeden kierunek na następną próbę.

Nie wyświetlać jednocześnie trzech podobnych, niezależnych hintów.

Przykład:

> **Moment zerwania:** nazwałeś Rycerza słabym.
>
> **Wzorzec:** próbowałeś przekonać go potrzebą pomocy, ale on słyszał litość.
>
> **Nowy plan:** przedstaw pomoc jako wspólny obowiązek wobec zamku.

## Testy akceptacji

- Po pierwszym pozytywnym tagu gracz otrzymuje informację, co zadziałało.
- Red line daje natychmiastową diagnozę związaną z konkretną wiadomością.
- Trzy powtórzone strategie bez wzrostu osi celu uruchamiają zastój.
- Zmiana `responseMode` generuje przełom tylko raz dla danego progu.
- Użycie lore daje Echo Kroniki i rozróżnia argument od szantażu.
- Podszept pozostaje w Zapisie rozmowy po zniknięciu toastu.
- Startowe opisy emocji nie sugerują, że gracz już przegrywa.
- Tryb subtelny, standardowy i wyraźny różnią się częstotliwością, nie mechaniką zwycięstwa.
- Żaden podszept nie zawiera pełnej, gotowej kwestii spełniającej strict objective check.
