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
| `route-stops.test.js` | Route knijperwagen met 1, 3, 8 en 15 stops: kop van een ingeklapte stop, meldingen en springen naar de stop, verplaatsen (knoppen, toetsenbord, slepen met muis en touch), verwijderen met ongedaan maken, dupliceren, opnieuw openen en delen, zonder project |
| `layout.test.js` | Smalle telefoons (320 en 390 px): geen zijwaartse scroll, knoppen minstens 44px, actiebalk, recente projecten |
| `design.test.js` | Ontwerpafspraken: gedeelde onderdelen niet herdefinieerd, geen losse radius-waarden of decoratieve animaties, contrast, tikdoelen, toetsenbordfocus, geen zijwaartse scroll op zes breedtes |
| `robuust.test.js` | Kapotte of vreemde opslag (7 sleutels x 11 varianten x 7 pagina's), opslag vol of geblokkeerd, 20 ongeldige adressen: nooit een fout of lege pagina |
| `behoud.test.js` | Alleen kijken wijzigt geen gegevens (byte voor byte), oude formaten van logboek en route, foto's blijven na herladen en wisselen van dag |
| `sync-storing.test.js` | Synchroniseren bij storing, geen verbinding, ingetrokken token, kapot bestand; gelijktijdige wijzigingen en verwijderingen; samenvoegregels met rare gegevens |
| `offline-bibliotheken.test.js` | Via een lokale server: alle pagina's, Leaflet en jsPDF offline; een nieuwe versie vervangt de oude kopie en de oude cache |
| `pdf-tekens.test.js` | Dag- en weekrapport met bijzondere tekens (Łódź, emoji, euro) en 70 regels over meerdere pagina's (leest de PDF met pdftotext, anders overgeslagen) |
| `veilige-zone.test.js` | Notch en zijranden op een iPhone, nagebootst met Chromium (geen echte iPhone) |
| `toegankelijkheid.test.js` | Namen en labels, live-meldingen, Esc sluit dialogen en de focus keert terug |
| `flows-zonder-fouten.test.js` | Alle gebruiksstromen zonder internet en toestemmingen: geen scriptfouten of onbehandelde beloften |
| `nav.test.js` | Onderbalk in alle drie de pagina's: Home en een knop per tool, de juiste knop actief, de actiebalk van de tools blijft zichtbaar boven de onderbalk, de terugknop in de kop |
| `logboek.test.js` | Logboek: project en datum kiezen, vanzelf bewaren met vast id, materieel en voorstellen, een lege dag wordt niet bewaard, wisselen van project of datum haalt niets door elkaar |
| `sync-projecten-logboek.test.js` | Synchroniseren van Projecten en Logboek tussen twee apparaten: aanmaken, wijzigen, verwijderen, geen dubbele projecten bij een nieuw apparaat |
| `projecten-locatie.test.js` | Locatie per project: instellen (zoeken, huidige locatie, uit Locatie delen), wissen, weer in het logboek op de projectlocatie, Locatie delen start op de projectlocatie |
| `logboek-weekrapport.test.js` | Weekrapport als PDF: dialoog en weekkeuze, bestand met project en weeknummer, foto's alleen met de schakelaar |
| `logboek-lagen.test.js` | Logboek in lagen: overzicht, dagen van een project met samenvatting, één dag met actiebalk, vorige en volgende dag, Opslaan en terug, dag verwijderen, nieuwe dag vandaag, terugknop, zoeken |
| `logboek-uitbreiding.test.js` | Logboek-onderdelen: weer rond 12:00, personeel en materieel van partners, zelfde als vorige dag, stagnatie, leveringen, meerwerk, veiligheid, overig, oud formaat en rapport |
| `logboek-dag.test.js` | Dagregistratie: bestaande en oude registraties blijven intact, lege/gedeeltelijke/uitgebreide dag, aantal en uren in de regel, samenvattingen, bewaarstatus, overnemen van de vorige dag met ongedaan maken, half ingevulde regels, dagnavigatie, dagenlijst en weekoverzicht, foto's, smalle en brede schermen |
| `logboek-pdf.test.js` | Dagrapport als PDF: bestand met projectnaam en datum, foto erin, melding en foutmelding zonder verbinding (de bibliotheek komt uit `node_modules`) |
| `logboek-foto.test.js` | Foto's in het logboek: stempel en verkleinen, bewaren op het apparaat, openen en verwijderen |
| `vanuit-project.test.js` | Werken vanuit Projecten: gegevens van een project, knoppen naar de tools, Locatie delen en Route openen met dat project, eigen bewaarde gegevens blijven ongewijzigd |
| `project-kiezen.test.js` | Project kiezen uit de gedeelde lijst in Locatie delen en als voorstel in Route knijperwagen |
| `projecten.test.js` | Projectlijst: kopiëren uit Locatie delen zonder daar iets te wijzigen, vast id, bewerken, dubbelen en verwijderen |
| `projecten-venster.test.js` | Projectlijst met locatie, projectvenster op telefoon, tablet en desktop, bewerken, annuleren, opslaan en verwijderen, terug uit een tool, toetsenbord (verkleind scherm), project zichtbaar in Route |
| `version.test.js` | Eén appversie: SemVer-syntaxis, bovenste CHANGELOG-sectie gelijk aan `version.js`, `version.js` in `LOCAL`, geen eigen `VERSION =` in de pagina's, `Versie 1.0.0` zichtbaar in alle drie |

`mock-github.js` is de nagebootste GitHub; die wordt door de sync-tests gebruikt. De tests gebruiken je echte GitHub of je token nergens.

## Een nieuwe test toevoegen

Maak een bestand dat eindigt op `.test.js`. Het wordt vanzelf meegenomen. Kijk naar `layout.test.js` voor een kort voorbeeld; `ok(waar, 'tekst')` schrijft `OK` of `FOUT`.
| `locatie-flow.test.js` | Locatie delen: zoeken en kiezen, samenvatting, pin verplaatsen, GPS, projectlocatie, ongeldige invoer, geen internet, deelacties en indeling op zes breedtes |
