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
| `nav.test.js` | Onderbalk in alle drie de pagina's: Home en een knop per tool, de juiste knop actief, de actiebalk van de tools blijft zichtbaar boven de onderbalk, de terugknop in de kop |
| `logboek.test.js` | Logboek: project en datum kiezen, vanzelf bewaren met vast id, materieel en voorstellen, een lege dag wordt niet bewaard, wisselen van project of datum haalt niets door elkaar |
| `logboek-foto.test.js` | Foto's in het logboek: stempel en verkleinen, bewaren op het apparaat, openen en verwijderen |
| `vanuit-project.test.js` | Werken vanuit Projecten: gegevens van een project, knoppen naar de tools, Locatie delen en Route openen met dat project, eigen bewaarde gegevens blijven ongewijzigd |
| `project-kiezen.test.js` | Project kiezen uit de gedeelde lijst in Locatie delen en als voorstel in Route knijperwagen |
| `projecten.test.js` | Projectlijst: kopiëren uit Locatie delen zonder daar iets te wijzigen, vast id, bewerken, dubbelen en verwijderen |
| `version.test.js` | Eén appversie: SemVer-syntaxis, bovenste CHANGELOG-sectie gelijk aan `version.js`, `version.js` in `LOCAL`, geen eigen `VERSION =` in de pagina's, `Versie 1.0.0` zichtbaar in alle drie |

`mock-github.js` is de nagebootste GitHub; die wordt door de sync-tests gebruikt. De tests gebruiken je echte GitHub of je token nergens.

## Een nieuwe test toevoegen

Maak een bestand dat eindigt op `.test.js`. Het wordt vanzelf meegenomen. Kijk naar `layout.test.js` voor een kort voorbeeld; `ok(waar, 'tekst')` schrijft `OK` of `FOUT`.
