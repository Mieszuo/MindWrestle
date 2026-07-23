# Matryca Kroniki — poziomy 1–7

Pełne copy do ekranu po poziomie, wpisów Kroniki i wstrzykiwania lore.  
**Źródło maszynowe:** [data/chronicle-entries.json](./data/chronicle-entries.json)

## Reguła przejścia: cel → wyznanie → Kronika

`completionReveal` jest **wypowiedzią postaci**, nie bezosobowym tekstem narratora. Po spełnieniu celu mechanicznego NPC wypowiada ją lub jej skrócony wariant w scenie. Dopiero potem otwiera się `StoryBeatScreen`, który interpretuje znaczenie tej wypowiedzi.

```text
objective completed
→ ostatnia odpowiedź NPC / completionReveal
→ StoryBeatScreen
→ VictoryModal z wynikiem
```

Dzięki temu gracz nie otrzymuje z Kroniki informacji, której rozmówca nigdy nie ujawnił. `completionReveal` nie jest dodatkowym warunkiem zwycięstwa.

---

## Poziom 1 — Mila

| Pole | Treść |
|------|--------|
| **Slug fragmentu** | `mila-orchard-memory` |
| **Tytuł Kroniki** | Pierwsze Milczenie: Pamięć |
| **completionReveal** | To nie było tylko wspomnienie o sadzie, wędrowcze. To był znak. Handlarz przyniósł potem coś w srebrnej sakwie i mówił, że za to już zapłacono. |
| **chronicleEntry** | Mila pamięta sad i czerwony owoc. Nie zna znaczenia obrazu, ale wie, że Handlarz zabrał z lasu coś, co nie należało do niego. |
| **nextLevelClue** | Handlarz nie wierzy w prośby. Ale wierzy w długi. |
| **characterTruth** | Jako jedyna pamięta świat sprzed Milczenia — obrazem, nie słowem. |
| **postLevelImage** | `/narrative/beats/01-mila-silver-fruit.webp` |
| **postLevelImagePrompt** | Mila w lesie/sadzie, czerwony owoc w dłoniach, w oddali cień Handlarza ze srebrną sakwą, baśniowy styl, ciepłe światło |
| **knownLoreForLevel** | *(brak — pierwszy poziom)* |
| **loreContextForPrompts** | *(puste)* |

**Sugestia rozmowna (UI):** Mów spokojnie, przez opowieść — nie o sadzie wprost.

---

## Poziom 2 — Handlarz

| Pole | Treść |
|------|--------|
| **Slug** | `merchant-price-of-silence` |
| **Tytuł** | Drugie Milczenie: Cena |
| **completionReveal** | Trzysta. Ani monety mniej. I weź to, zanim przypomnę sobie, że niektóre długi powinny zostać martwe. |
| **chronicleEntry** | Handlarz sprzedał kiedyś coś więcej niż towar. Znał cenę ciszy i wiedział, komu ją dostarczyć. |
| **nextLevelClue** | Rycerz nie złamał przysięgi. On wykonał ją zbyt dosłownie. |
| **characterTruth** | Handlował imionami, sekretami, pamięcią; pomógł przenieść fragment Pierwszego Słowa w stronę korony. |
| **postLevelImage** | `/narrative/beats/02-merchant-debt-book.webp` |
| **postLevelImagePrompt** | Handlarz zamyka starą księgę długu, na stronie symbol rycerskiej przysięgi/herbu, targ, zmierzch |
| **knownLoreForLevel** | Fragment Mili (srebrny owoc, dług, sad) |

**Sugestia:** Nie błagaj. Mów o wartości i długu — nie o moralności z góry.

**Copy celu (migracja):** Wynegocjuj **srebrny klucz przejścia** z 500 do 300 monet. Klucz otwiera zewnętrzną bramę szlaku, nie Bramę Króla.

---

## Poziom 3 — Rycerz

| Pole | Treść |
|------|--------|
| **Slug** | `knight-oath-too-literal` |
| **Tytuł** | Trzecie Milczenie: Przysięga |
| **completionReveal** | Pomoc… Tak. Jeśli obowiązek ma przetrwać noc, nie uniosę go sam. Tę przysięgę źle zrozumiałem już raz. |
| **chronicleEntry** | Rycerz nie ukrył prawdy z tchórzostwa. Uwierzył, że posłuszeństwo jest honorem, nawet gdy prowadziło do milczenia całego królestwa. |
| **nextLevelClue** | Ork nie był potworem tej historii. Był świadkiem, którego nikt nie chciał wysłuchać. |
| **characterTruth** | Strażnik paktu; przysięga brzmiała „chroń ludzi przed prawdą”. |
| **postLevelImage** | `/narrative/beats/03-knight-broken-oath.webp` |
| **postLevelImagePrompt** | Rycerz klęczy przy pękniętym herbie/przysiędze, w oddali sylwetka Orka pod popękanym niebem |

---

## Poziom 4 — Ork

| Pole | Treść |
|------|--------|
| **Slug** | `orc-shattered-sky-witness` |
| **Tytuł** | Czwarte Milczenie: Świadectwo |
| **completionReveal** | Dobrze. Młot leży. Ale słuchaj, wędrowcze: my nie zaczęliśmy tamtej nocy. My tylko nie uciekliśmy. |
| **chronicleEntry** | Ork był świadkiem Pękniętego Nieba. Jego lud nazwano winowajcami, bo łatwiej było oskarżyć siłę niż przyznać się do kłamstwa. |
| **nextLevelClue** | Mędrzec spisał świadectwo Orka. Potem sam je spalił. |
| **characterTruth** | Widział prawdę; ludzie wolą mit o „potworze”. |
| **postLevelImage** | `/narrative/beats/04-ork-shattered-sky.webp` |
| **postLevelImagePrompt** | Ork odkłada młot, za nim wizja płonących kart i sylwetka Mędrca, popękane niebo |

---

## Poziom 5 — Mędrzec

| Pole | Treść |
|------|--------|
| **Slug** | `sage-ashes-of-truth` |
| **Tytuł** | Piąte Milczenie: Zapis |
| **completionReveal** | Tak. Kamień Zapisu spoczywa tam, gdzie trzeci krok biblioteki spotyka cień. Zawsze wiedziałem, że ktoś kiedyś dojdzie tam nie rozkazem, lecz pytaniem. |
| **chronicleEntry** | Mędrzec nie zapomniał prawdy. Wymazał ją świadomie, wierząc, że ocala świat przed kolejnym pęknięciem. |
| **nextLevelClue** | Król nie został oszukany przez Boga. To Król poprosił, by świat zamilkł. |
| **characterTruth** | Spalił pełne świadectwo Orka, ale ocalił jego fragment w Kamieniu Zapisu ukrytym przy trzecim kroku biblioteki. |
| **postLevelImage** | `/narrative/beats/05-sage-ashes-crown.webp` |
| **postLevelImagePrompt** | Mędrzec trzyma popiół kroniki, w cieniu korona i zamknięta brama, biblioteka |

**Mechanika:** zachować panel guess + rozmowę zagadkową. Zmienić etykiety i strict check z „klucza” na **Kamień Zapisu / jego lokalizację** w osobnym PR contentowym.

---

## Poziom 6 — Król

| Pole | Treść |
|------|--------|
| **Slug** | `king-ordered-silence` |
| **Tytuł** | Szóste Milczenie: Rozkaz |
| **completionReveal** | Otworzyć bramę. Nie dlatego, że mnie pokonałeś. Dlatego, że królestwo nie może wiecznie oddychać przez zamknięte usta. |
| **chronicleEntry** | Król nie był ofiarą Boskiego Milczenia. Był tym, który poprosił o ciszę, kiedy prawda stała się zbyt ciężka dla tronu. |
| **nextLevelClue** | Bóg nie ukradł ludziom głosu. Ludzie oddali mu swoje milczenie. |
| **characterTruth** | Zamknął bramę po prośbie do Boga; boi się utraty sensu panowania. |
| **postLevelImage** | `/narrative/beats/06-king-gate-crown.webp` |
| **postLevelImagePrompt** | Król przed otwartą bramą, korona obok tronu, światło za portalem |

**Briefing przed rozmową (UI — obowiązkowy copy):**  
Król słucha argumentów z drogi. W rozmowie możesz odwołać się do tego, co odkryłeś u Mili, Handlarza, Rycerza, Orka i Mędrca — **to ułatwia przekonanie**, ale nie jest jedyną drogą do wygranej.

---

## Poziom 7 — Bóg Milczenia

| Pole | Treść |
|------|--------|
| **Slug** | `god-first-word-again` |
| **Tytuł** | Siódme Milczenie: Odpowiedzialność |
| **completionReveal** | Nie odebrałem im słów, wędrowcze. Oni złożyli je we mnie, bo bali się własnego głosu. Ale ty… ty nie przyszedłeś wyrwać prawdy. Przyszedłeś ją unieść. |
| **chronicleEntry** | Bóg Milczenia nie był tyranem. Był naczyniem cudzych lęków. Wędrowiec przekonał go, że świat może znów odpowiadać za własne słowa. |
| **nextLevelClue** | *(brak — uruchamia ending slides)* |
| **characterTruth** | Pełna prawda kanoniczna — patrz [01-world-canon.md](./01-world-canon.md) |
| **postLevelImage** | `/narrative/beats/07-god-seven-fragments.webp` |
| **postLevelImagePrompt** | Siedem fragmentów światła nad Wędrowcem, sylwetki siedmiu postaci w oddali |

**Cel gracza:** Spraw, by Bóg wypowiedział **pierwsze słowo od Pękniętego Nieba** — prawdę o świecie i o milczeniu, nie rozkaz.

**knownLoreForLevel:** wszystkie odkryte fragmenty 1–6.

---

## Fragmenty do `knownLoreContext` (skrót dla promptów)

Po ukończeniu poziomu *N*, poziom *N+1* dostaje w promptach **krótkie bullet points** (EN lub PL — decyzja: **PL** spójne z dialogiem):

Przykład dla Handlarza (po Mili):
- Mila wspomniała sad i czerwony owoc.
- Sugerowała, że kupiec przyniósł srebrny owoc — to nie był dar, lecz zapłata.

Pełna lista w JSON: pole `promptBullets` per entry.
