# Locatie delen en Route knijperwagen

Twee kleine webtools voor dagelijks gebruik op de telefoon en de computer. Ze draaien volledig in de browser, hebben geen account of server nodig en zijn te installeren op het beginscherm.

| Tool | Adres | Wat het doet |
|---|---|---|
| **Locatie delen** | https://arwinvdh.github.io/locatie/ | Maakt van een Maps-link, coördinaten of adres een WhatsApp-bericht en een afbeelding met luchtfoto, projectgegevens en contactblok. |
| **Route knijperwagen** | https://arwinvdh.github.io/locatie/route.html | Stelt een route met stops (laden, lossen, ophalen) samen en maakt er een kant-en-klaar WhatsApp-bericht van. |

## Locatie delen

- Invoer: Google Maps-link (de pin wordt uit de link gelezen, niet het kaartmidden), coördinaten, adres, plaatsnaam uit een link, tikken op de kaart of de huidige positie.
- Adressen en pinnen voor Nederland via PDOK, daarbuiten via OpenStreetMap.
- Afbeelding in staand formaat (4:5), met afrondingen die passen bij de weergave in WhatsApp op iOS: projectnummer en naam, adres, uitvoerder en telefoon, optioneel een label op de pin, regiokaart, noordpijl, straatnamen en perceelgrenzen.
- Bericht met emoji's, adres op twee regels, optioneel aanrijden-via en melden bij aankomst, en een Maps-link (locatie of route).
- Projecten worden automatisch bewaard en komen terug als suggestie. Een back-up maken en terugzetten als bestand kan ook.

## Route knijperwagen

- Stops als accordeon met acties, plaats, project, uur, omschrijving en routelink.
- Suggesties uit eerdere routes, controle op ontbrekende gegevens, ongedaan maken en slepen om de volgorde te wijzigen.
- Eerdere routes en suggesties worden bewaard op het apparaat zelf (met een back-up via het tandwiel). Wil je ze op meerdere apparaten, zet dan synchroniseren aan (zie hieronder).
- Een ruwe route plakken: zet elke stop op een eigen regel met Laden, Lossen of Ophalen erin, bijvoorbeeld `1. Laden bij R3S 6.00 -> 1 bigbag spramex`. Plaats, uur, projectnummer, link en items worden uit de regel gehaald. Dit is een eenvoudige tekstherkenning, geen AI: wat niet herkend wordt, vul je zelf aan. Een regel zonder Laden, Lossen of Ophalen hoort bij de stop erboven.
- Voorstellen (chips) onder de velden, in deze volgorde:
  - **Plaats:** wat er vorige keer na de vorige plek kwam, daarna plaatsen die bij laden of lossen passen, daarna vaak en recent gebruikte. De plek die je net gebruikte staat laag.
  - **Project:** het project van deze plaats (nog geen plaats: van de plek die er meestal op volgt), dan de projecten van de stops erboven (laatste eerst), dan recent gebruikte. Bij elk project staat de plaats. Bij een laadstop wordt een project nooit automatisch ingevuld.
  - **Uur:** de laatste tijd op deze plaats en tijden die later zijn dan de stop erboven, dus hoe verder op de dag hoe later.
  - **Items:** wat er net geladen is (bij lossen), wat je op deze plaats eerder deed, wat al in de route staat, de rest. Hetzelfde item met een ander aantal staat maar één keer, met het nieuwste aantal.
  - De tool leert dit pas als je een route kopieert of via WhatsApp verstuurt. Een stop telt één keer mee per dag, ook als je de route vaker kopieert.
- Enter bij een nieuwe plaats gaat naar Project, bij een bekende plaats naar Items.

## Bestanden

```
index.html              Locatie delen
route.html              Route knijperwagen
manifest.webmanifest    installatiegegevens Locatie delen
route.webmanifest       installatiegegevens Route knijperwagen
sw.js                   service worker: opent de tools ook zonder of met slecht bereik
sync.js                 synchroniseren tussen apparaten via een eigen privérepo (gedeeld door beide tools)
icons/                  iconen voor het beginscherm
tests/                  automatische controles (zie hieronder)
```

Elke tool is één bestand met eigen stijl en code, zonder build-stap. De enige externe code is Leaflet 1.9.4, geladen van cdnjs.

## Synchroniseren tussen apparaten

Standaard staan gegevens alleen op het apparaat zelf. Wil je projecten, eerdere routes, suggesties, je naam en telefoon en je laatste invoer op meerdere apparaten hebben, dan kun je ze laten bewaren in een **eigen privérepo op GitHub**. Er is geen extra account of server nodig.

Eenmalig instellen:

1. Maak op github.com een nieuwe **privérepo** (bijvoorbeeld `locatie-data`) met een README.
2. Maak een fine-grained token: Settings, Developer settings, Personal access tokens, Fine-grained tokens. Kies bij Repository access **Only select repositories** en alleen die repo, en zet bij Repository permissions **Contents** op **Read and write**. Kies een vervaldatum.
3. Open in de tool het tandwiel, vul de reponaam en de token in en tik op **Verbinden**. Beide tools gebruiken dezelfde verbinding.
4. Een extra apparaat koppel je met **Koppellink voor ander apparaat** (in het tandwiel, zodra je verbonden bent): stuur de link naar jezelf, open hem op het andere apparaat en tik op **Koppelen**. De token zit in het deel na de `#`, dat nooit naar een server gaat, en wordt bij het openen direct uit de adresbalk gehaald. Het apparaat koppelt pas na jouw bevestiging, en de bevestiging toont de reponaam, zodat een link naar andermans repo opvalt.

Wat er gebeurt:

- De gegevens worden als JSON-bestand in `data/` van die repo gezet (`locatie.json` en `route.json`). Elke wijziging is een commit, dus de geschiedenis staat er ook.
- Per project of route wint de nieuwste versie. Een verwijdering wordt ook gedeeld. Wijzigen twee apparaten tegelijk, dan worden ze samengevoegd.
- Je laatste invoer wordt nooit zomaar overgenomen. Staat er op een ander apparaat nieuwere invoer, dan zie je een melding met Overnemen of Negeren.
- De tool weigert een openbare repo, zodat je gegevens niet publiek komen te staan.

Goed om te weten:

- De token staat in de browser van dat apparaat en gaat alleen naar `api.github.com`. De token staat bewust niet in de code van de website: die is openbaar, en GitHub trekt een token die in een openbare repo belandt automatisch in.
- De koppellink bevat de token. Deel hem alleen met jezelf en verwijder het bericht daarna. Maak hem alleen voor die ene repo, met een vervaldatum. Verloopt de token, dan zie je dat in het tandwiel en maak je een nieuwe.
- Alle GitHub Pages-sites onder `arwinvdh.github.io` delen dezelfde browseropslag. Zet daarom geen andere sites van derden onder dit account.

## Bijwerken en uitrollen

1. Pas het bestand aan en test het lokaal in een browser.
2. Draai de tests (zie hieronder). Alles moet op "Alles goed" eindigen.
3. Verhoog `VERSION` in het script van de betreffende tool. Het versienummer staat in de instellingen (tandwiel).
4. Heb je `index.html`, `route.html`, `sync.js`, iconen of manifesten aangepast, verhoog dan ook `CACHE` bovenin `sw.js`. Anders blijft de oude kopie bewaard.
5. Push naar `main`. GitHub Pages publiceert binnen ongeveer een minuut (Settings, Pages: deploy from branch `main`, map `/`).
6. Op een telefoon: sluit de app helemaal en open hem opnieuw. Bij een nieuw icoon moet je de app van het beginscherm verwijderen en opnieuw toevoegen.

De tools bestaan alleen als deze website. Er is geen aparte Claude-versie meer.

## Tests

In `tests/` staan automatische controles die de tools in een echte (onzichtbare) browser doorlopen: synchroniseren met een nagebootste GitHub, de koppellink, ruwe route plakken, Enter-toets en uurchips, en de opmaak op smalle telefoons (geen zijwaartse scroll, knoppen minstens 44px hoog). Zie `tests/README.md` voor het starten.

## Woordenlijst

| Woord | Betekent hier |
|---|---|
| repo | de map met alle bestanden van deze tools op GitHub |
| commit | een opgeslagen wijziging met een korte beschrijving |
| push | wijzigingen naar GitHub sturen, waarna de website bijwerkt |
| cache | de bewaarde kopie van de tool op je telefoon, zodat hij ook offline opent |
| service worker | het onderdeel (`sw.js`) dat die kopie beheert |
| token | een wachtwoord voor één taak, hier alleen voor de sync met je eigen privérepo |

## Externe diensten

| Dienst | Gebruikt voor |
|---|---|
| PDOK Locatieserver | adres zoeken en het dichtstbijzijnde adres bij een pin (Nederland) |
| PDOK luchtfoto (`luchtfotorgb`), BRT-achtergrondkaart, kadastrale kaart, bestuurlijke gebieden | luchtfoto, kaart, perceelgrenzen en gemeentegrens |
| Esri World Imagery en Transportation | luchtfoto buiten Nederland en straatnamen op de luchtfoto |
| GitHub API (alleen als je synchroniseren aanzet) | je gegevens bewaren in je eigen privérepo |
| OpenStreetMap (tegels en Nominatim) | kaart en adressen buiten Nederland, en als terugval |
| cdnjs | Leaflet |

Er zijn geen trackers, cookies of accounts. Naam en telefoonnummer van de afzender blijven op het apparaat en komen alleen in het bericht en de afbeelding die je zelf verstuurt. De diensten hierboven ontvangen alleen de coördinaten, zoekopdrachten en tegelverzoeken die nodig zijn voor de kaart.

## Bekende beperkingen

- Zonder synchronisatie worden gegevens per apparaat en per browser bewaard. Op een iPhone zijn Safari en de app op het beginscherm gescheiden; gebruik daarom altijd de app op het beginscherm.
- Korte Google Maps-links (`maps.app.goo.gl`) kunnen alleen worden gelezen met behulp van gratis tussendiensten van derden en werken daarom niet altijd. Een volledige link, de coördinaten of het adres werken altijd.
- Delen van de afbeelding gebruikt het deelmenu van het toestel. Wordt dat geblokkeerd, dan wordt de afbeelding opgeslagen en het bericht gekopieerd.

## Problemen oplossen

- **Oude versie zichtbaar:** sluit de app, open hem opnieuw en vernieuw. Staat het versienummer in het tandwiel nog niet goed, verwijder dan het icoon en voeg de pagina opnieuw toe.
- **Kaart blijft leeg:** controleer de verbinding. Valt een kaartbron uit, dan schakelt de tool zelf over op een reservekaart en meldt dat.
- **Een fout in beeld:** de tool toont onderin kort "Fout: …". Noteer de tekst en het versienummer.
