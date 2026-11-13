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
- Projecten worden automatisch bewaard en komen terug als suggestie. Exporteren en importeren als bestand kan ook.

## Route knijperwagen

- Stops als accordeon met acties, plaats, project, uur, omschrijving en routelink.
- Suggesties uit eerdere routes, controle op ontbrekende gegevens, ongedaan maken en slepen om de volgorde te wijzigen.
- Eerdere routes en suggesties worden bewaard. In de Claude-versie worden ze gedeeld tussen apparaten; op deze pagina staan ze alleen op het apparaat zelf (met een back-up via het tandwiel).
- Een ruwe route plakken en laten uitwerken werkt alleen in de Claude-versie.

## Bestanden

```
index.html              Locatie delen
route.html              Route knijperwagen
manifest.webmanifest    installatiegegevens Locatie delen
route.webmanifest       installatiegegevens Route knijperwagen
sw.js                   service worker: opent de tools ook zonder of met slecht bereik
sync.js                 synchroniseren tussen apparaten via een eigen privérepo (gedeeld door beide tools)
icons/                  iconen voor het beginscherm
scripts/                hulpscripts (zie hieronder)
```

Elke tool is één bestand met eigen stijl en code, zonder build-stap. De enige externe code is Leaflet 1.9.4, geladen van cdnjs.

## Synchroniseren tussen apparaten

Standaard staan gegevens alleen op het apparaat zelf. Wil je projecten, eerdere routes, suggesties, je naam en telefoon en je laatste invoer op meerdere apparaten hebben, dan kun je ze laten bewaren in een **eigen privérepo op GitHub**. Er is geen extra account of server nodig.

Eenmalig instellen:

1. Maak op github.com een nieuwe **privérepo** (bijvoorbeeld `locatie-data`) met een README.
2. Maak een fine-grained token: Settings, Developer settings, Personal access tokens, Fine-grained tokens. Kies bij Repository access **Only select repositories** en alleen die repo, en zet bij Repository permissions **Contents** op **Read and write**. Kies een vervaldatum.
3. Open in de tool het tandwiel, vul de reponaam en de token in en tik op **Verbinden**. Doe dit op elk apparaat één keer. Beide tools gebruiken dezelfde verbinding.

Wat er gebeurt:

- De gegevens worden als JSON-bestand in `data/` van die repo gezet (`locatie.json` en `route.json`). Elke wijziging is een commit, dus de geschiedenis staat er ook.
- Per project of route wint de nieuwste versie. Een verwijdering wordt ook gedeeld. Wijzigen twee apparaten tegelijk, dan worden ze samengevoegd.
- Je laatste invoer wordt nooit zomaar overgenomen. Staat er op een ander apparaat nieuwere invoer, dan zie je een melding met Overnemen of Negeren.
- De tool weigert een openbare repo, zodat je gegevens niet publiek komen te staan.

Goed om te weten:

- De token staat in de browser van dat apparaat en gaat alleen naar `api.github.com`. Maak hem alleen voor die ene repo, met een vervaldatum. Verloopt de token, dan zie je dat in het tandwiel en maak je een nieuwe.
- Alle GitHub Pages-sites onder `arwinvdh.github.io` delen dezelfde browseropslag. Zet daarom geen andere sites van derden onder dit account.
- In de Claude-versie van Route knijperwagen doet de database van Claude dit werk. Daar is deze instelling niet beschikbaar.

## Bijwerken en uitrollen

1. Pas het bestand aan en test het lokaal in een browser.
2. Verhoog `VERSION` in het script van de betreffende tool. Het versienummer staat in de instellingen (tandwiel).
3. Heb je `index.html`, `route.html`, `sync.js`, iconen of manifesten aangepast, verhoog dan ook `CACHE` bovenin `sw.js`. Anders blijft de oude kopie bewaard.
4. Push naar `main`. GitHub Pages publiceert binnen ongeveer een minuut (Settings, Pages: deploy from branch `main`, map `/`).
5. Op een telefoon: sluit de app helemaal en open hem opnieuw. Bij een nieuw icoon moet je de app van het beginscherm verwijderen en opnieuw toevoegen.

### Claude-versie van Route knijperwagen

De Claude-versie is dezelfde pagina zonder de installatieonderdelen en zonder service worker. Maak hem met:

```
python3 scripts/make-route-artifact.py route-artifact.html
```

en publiceer het resultaat naar het bestaande artifact. Gedeelde opslag en het plakken van een ruwe route komen van het artifact zelf. Het bestand wordt niet in deze repo bewaard (`.gitignore`).

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
