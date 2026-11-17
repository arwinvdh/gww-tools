# Tests

Deze controles openen de tools in een onzichtbare browser en klikken zoals jij zou doen. Ze controleren dat niets kapot is gegaan na een wijziging.

## Eenmalig voorbereiden

Je hebt [Node.js](https://nodejs.org) nodig. Daarna, in de map `tests`:

```
npm install
npx playwright install chromium
```

## Draaien

```
npm test
```

Je ziet per bestand hoeveel controles gelukt zijn. Aan het eind staat **Alles goed** of **LET OP** met welke controle faalde. Een mislukte regel begint met `FOUT`.

Staat de browser ergens anders (bijvoorbeeld in een testomgeving), zet dan `PW_CHROMIUM=/pad/naar/chromium` voor het commando.

## Wat er getest wordt

| Bestand | Controleert |
|---|---|
| `sync-locatie.test.js` | Synchroniseren van Locatie delen met een nagebootste GitHub: verbinden, projecten, conflicten, verwijderen, storingen |
| `sync-route.test.js` | Hetzelfde voor Route knijperwagen, inclusief verwijderde routes |
| `koppellink.test.js` | De koppellink voor een tweede apparaat, ook met kapotte of verkeerde links |
| `route-invullen.test.js` | Ruwe route plakken, Enter-toets tussen velden, uurchips uit eigen gebruik |
| `layout.test.js` | Smalle telefoons (320 en 390 px): geen zijwaartse scroll, knoppen minstens 44px, actiebalk, recente projecten |

`mock-github.js` is de nagebootste GitHub; die wordt door de sync-tests gebruikt. De tests gebruiken je echte GitHub of je token nergens.

## Een nieuwe test toevoegen

Maak een bestand dat eindigt op `.test.js`. Het wordt vanzelf meegenomen. Kijk naar `layout.test.js` voor een kort voorbeeld; `ok(waar, 'tekst')` schrijft `OK` of `FOUT`.
