# GWW Tools

Twee kleine webtools voor dagelijks gebruik op de telefoon en de computer. Ze draaien volledig in de browser, hebben geen account of server nodig en zijn te installeren op het beginscherm.

| Tool | Adres | Wat het doet |
|---|---|---|
| **Locatie delen** | https://arwinvdh.github.io/gww-tools/ | Maakt van een Maps-link, coördinaten of adres een WhatsApp-bericht en een afbeelding met luchtfoto, projectgegevens en contactblok. |
| **Route knijperwagen** | https://arwinvdh.github.io/gww-tools/route.html | Stelt een route met stops (laden, lossen, ophalen) samen en maakt er een kant-en-klaar WhatsApp-bericht van. |
| **GWW Tools** (startpagina) | https://arwinvdh.github.io/gww-tools/start.html | Rijen naar alle tools met korte beschrijving, een compacte synchronisatiestatus, een lege toestand zonder projecten, recente projecten en routes onder hun tool (alleen lezen; een tik laadt het item direct in de tool) en onder een uitklapper het koppelen. Zet deze pagina op je beginscherm als je één app wilt waarmee je de rest opent. |
| **Projecten** | https://arwinvdh.github.io/gww-tools/projecten.html | Gedeelde projectlijst met een vast id per project en uitvoerder, telefoon en notitie; neemt de projecten uit Locatie delen over. Een project heeft een vaste locatie (huidige locatie, adres zoeken of uit Locatie delen). Vanuit een project open je Locatie delen (op de projectlocatie), Route of Logboek met dat project ingevuld (`#gp=<id>`). |
| **Logboek** | https://arwinvdh.github.io/gww-tools/logboek.html | In drie lagen: projecten, de dagen van een project en één dag met weer, werkzaamheden, personeel en materieel van partners, stagnatie, leveringen, meerwerk, veiligheid, overig en foto's met stempel. Bewaart vanzelf en maakt het dagrapport en het weekrapport (maandag t/m zondag, met totalen per partner en optioneel foto's) als PDF. |
| **Visie en fundament** | https://arwinvdh.github.io/gww-tools/visie.html | Werkdocument over het fundament voor het logboek en een eventuele uitrol. |

## Locatie delen

- Invoer: Google Maps-link (de pin wordt uit de link gelezen, niet het kaartmidden), coördinaten, adres, plaatsnaam uit een link, tikken op de kaart of de huidige positie.
- Adressen en pinnen voor Nederland via PDOK, daarbuiten via OpenStreetMap.
- Afbeelding in staand formaat (4:5), met afrondingen die passen bij de weergave in WhatsApp op iOS: projectnummer en naam, adres, uitvoerder en telefoon, optioneel een label op de pin, regiokaart, noordpijl, straatnamen en perceelgrenzen.
- Tot drie locaties per bericht (bijvoorbeeld inrit, werkterrein en kantine, tot enkele honderden meters uit elkaar): tik onder de kaart op **+ Tweede locatie** (daarna **+ Derde locatie**), zet de plek op dezelfde manier (link, adres, tikken op de kaart, of de pin slepen) en kies met **Locatie 1 / 2 / 3** welke je aanpast. Elke locatie heeft een eigen adres en een **vrij label** dat je zelf typt (met suggesties zoals Inrit werkterrein, Meldpunt, Keet, Kantine). **Locatie n weghalen** haalt er één weg, de volgende schuiven op. De kaart toont genummerde pins en in het bericht staat elke locatie met een eigen Maps-link. Op de afbeelding staan alle pins op één kaart: liggen ze ver uit elkaar, dan zoomt de kaart uit; liggen ze vlak bij elkaar, dan zoomt hij in. Projecten bewaren alle locaties.
- Adres bij een pin zonder huisnummer: de tool zoekt het dichtstbijzijnde adres (PDOK) en kijkt hoe ver dat weg ligt. Tot 20 m staat het adres er gewoon. Tussen 20 en 100 m wordt het "Nabij ...", tenzij de pin binnen 30 m van een andere straat staat dan die van het adres: dan komt die straat in het bericht, omdat een huisnummer aan een andere straat misleidt. Verder dan 100 m komt de dichtstbijzijnde echte weg (geen fietspad of naamloos pad, binnen 500 m), en anders alleen de plaats. Onder het adresveld kies je zelf het woord: Nabij, Ter hoogte van, Tegenover of Naast, want de tool weet niet aan welke kant van de weg je staat. Typ je het adres zelf, dan blijft dat zoals je het typt. De Maps-link en de coördinaten wijzen altijd de pin zelf aan.
- Bronvermelding: op de kaart op het scherm staat de bron in gewone namen (Beeldmateriaal Nederland voor de luchtfoto, Kadaster voor de kaart, Esri, OpenStreetMap). Op de afbeelding zelf staat bewust geen bronvermelding meer. Let op: sommige bronnen (zoals Esri en OpenStreetMap) vragen in hun voorwaarden wel om bronvermelding bij gebruik; PDOK-gegevens zijn vrij te gebruiken. Marges: tekst en labels houden minstens 36 tot 48 px afstand van de rand; bij meer locaties is de onderbalk hoger (290 px bij twee, 330 px bij drie locaties) met meer ruimte tussen de regels. Een label staat boven zijn pin, tenzij het een andere pin, een ander label, het kaartje of de balk raakt; dan komt het onder, rechts of links van zijn pin. `tests/locatie-marge.test.js` controleert dit.
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
projecten.html          gedeelde projectlijst met een vast id per project
logboek.html            logboek per project en dag: werkzaamheden en materieel
datasync.js             synchroniseren van Projecten en Logboek (bovenop sync.js)
nav.js                  onderbalk en lijst met tools (een nieuwe tool komt hier als één regel bij)
manifest.webmanifest    installatiegegevens Locatie delen
route.webmanifest       installatiegegevens Route knijperwagen
start.html              startpagina met tegels naar de tools
visie.html              visie en fundament: wat later nodig is voor een uitrol (werkdocument)
start.webmanifest       installatiegegevens van de startpagina
sw.js                   service worker: opent de tools ook zonder of met slecht bereik
version.js              het appversienummer (APP_VERSION), enige bron
CHANGELOG.md            wijzigingen per versie
sync.js                 synchroniseren tussen apparaten via een eigen privérepo (gedeeld door beide tools)
shared.css              gedeelde stijl (kleuren, ontwerpwaarden als variabelen, knoppen, velden, kaarten, kopband)
icons/                  iconen voor het beginscherm
tests/                  automatische controles (zie hieronder)
```

Elke tool is één HTML-bestand met eigen code en de stijl die alleen bij die tool hoort, plus de gedeelde `shared.css`. Er is geen build-stap.

### Opbouw van de stijl

`shared.css` begint met `@layer reset, base, components, overrides;`. Een regel in een latere laag wint van een regel in een eerdere laag, ook als die minder specifiek is. Daardoor hoeft een uitzondering (smal scherm, touch, bezig) niet meer op de goede plek in het bestand te staan. Zet een nieuwe regel in de laag die bij zijn rol past: gewone onderdelen in `components`, uitzonderingen in `overrides`. De aanpassing van de Leaflet-knoppen staat buiten de lagen, omdat Leaflet zelf ook buiten lagen staat. Heb je `shared.css` aangepast, verhoog dan ook `CACHE` in `sw.js`. De enige externe code is Leaflet 1.9.4, geladen van cdnjs, en jsPDF 4.2.1 voor het dagrapport, geladen van jsDelivr zodra je een rapport maakt.

## Synchroniseren tussen apparaten

Standaard staan gegevens alleen op het apparaat zelf. Wil je projecten, eerdere routes, suggesties, je naam en telefoon en je laatste invoer op meerdere apparaten hebben, dan kun je ze laten bewaren in een **eigen privérepo op GitHub**. Er is geen extra account of server nodig.

Eenmalig instellen:

1. Maak op github.com een nieuwe **privérepo** (bijvoorbeeld `locatie-data`) met een README.
2. Maak een fine-grained token: Settings, Developer settings, Personal access tokens, Fine-grained tokens. Kies bij Repository access **Only select repositories** en alleen die repo, en zet bij Repository permissions **Contents** op **Read and write**. Kies een vervaldatum.
3. Open de startpagina (`start.html`, kaart **Apparaten koppelen**) of het tandwiel van een tool, vul de reponaam en de token in en tik op **Verbinden**. Beide tools gebruiken dezelfde verbinding.
4. Een extra apparaat koppel je met **Koppellink voor ander apparaat** (in het tandwiel, zodra je verbonden bent): stuur de link naar jezelf, open hem op het andere apparaat en tik op **Koppelen**. De token zit in het deel na de `#`, dat nooit naar een server gaat, en wordt bij het openen direct uit de adresbalk gehaald. Het apparaat koppelt pas na jouw bevestiging, en de bevestiging toont de reponaam, zodat een link naar andermans repo opvalt.

### Koppelen met een pincode

In plaats van op elk apparaat de token te plakken, kun je de token met een pincode versleutelen:

1. Open `vault.html` (op de startpagina bij Apparaten koppelen, link **Pincode instellen of wijzigen**).
2. Vul de reponaam, de token en een pincode in (minstens 6 cijfers, liever 8 of meer) en tik op **Versleutelen**.
3. Kopieer de versleutelde tekst en zet hem als `vault.json` in de repo (naast `index.html`).
4. Daarna staat er bij **Apparaten koppelen** een veld voor de pincode. Typ de pincode en tik op **Ontgrendelen en koppelen**.

Waar je op moet letten: `vault.json` staat in een publieke repo. Iedereen kan het downloaden en proberen te ontsleutelen (AES-GCM, sleutel uit de pincode met 1.000.000 PBKDF2-rondes). Een pincode van 6 cijfers is met een snelle grafische kaart in minuten tot uren te raden, 8 cijfers of meer is praktisch niet te raden. De token geeft alleen toegang tot je ene privérepo en elke wijziging daarin is een commit die je kunt terugdraaien. Vervang je de token, verwijder dan de oude op GitHub en maak een nieuwe `vault.json`.

Wat er gebeurt:

- De gegevens worden als JSON-bestand in `data/` van die repo gezet (`locatie.json`, `route.json`, `projecten.json` en `logboek.json`). Foto's van het logboek blijven op het toestel. Elke wijziging is een commit, dus de geschiedenis staat er ook.
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
3. Heeft de wijziging gevolgen voor de app, kies dan een nieuw versienummer in `version.js` en zet een nieuwe sectie bovenaan `CHANGELOG.md`.
4. Verhoog `CACHE` bovenin `sw.js` (ook bij een nieuw bestand in `LOCAL`).
5. Open een pull request naar `main`. Na samenvoegen publiceert GitHub Pages binnen ongeveer een minuut (Settings, Pages: deploy from branch `main`, map `/`). De eigenaar maakt daarna, na controle, de tag `vX.Y.Z`.
6. Op een telefoon: sluit de app helemaal en open hem opnieuw. Bij een nieuw icoon moet je de app van het beginscherm verwijderen en opnieuw toevoegen.

De tools bestaan alleen als deze website. Er is geen aparte Claude-versie meer.

### Releaseregels

- Eén pull request met gevolgen voor de app is één release: een nieuwe versie in `version.js`, een sectie in `CHANGELOG.md` en een hoger `CACHE` in `sw.js`.
- Alleen docs- of testwijzigingen krijgen geen nieuwe versie.
- Een versienummer wordt nooit hergebruikt.
- Een migratie is niet automatisch een major: toets of het contract hieronder incompatibel verandert.
- De tag `vX.Y.Z` maakt de eigenaar na samenvoegen en controle.

## Ondersteund contract (1.0.0)

Dit valt eronder en blijft dus werken zoals het werkt:

- De pagina's `index.html`, `route.html`, `start.html` en `vault.html`, de manifesten en de iconen.
- De opslagsleutels in de browser (localStorage):
  - Locatie delen: `locdelen.draft`, `locdelen.draftT`, `locdelen.projects`, `locdelen.range`, `locdelen.layer`, `locdelen.regio`, `locdelen.link`, `locdelen.opt.labels`, `locdelen.opt.parcel`, `locdelen.opt.mini`, `locdelen.who`, `locdelen.role`, `locdelen.phone`, `locdelen.useWho`, `locdelen.usePhone`, `locdelen.profileT`, `locdelen.lastExport`, `locdelen.tipX`. In de code zijn ook `locdelen.base` en `locdelen.share` benoemd, maar die worden niet gebruikt.
  - Route knijperwagen: `knijperwagen-route-v2`, `knijperwagen-mem-v2`, `knijperwagen-routes-v2`, `knijperwagen-draftT`, `knijperwagen-tipX`, en de oudere `knijperwagen-route-v1` en `knijperwagen-items-v1` (alleen gelezen voor migratie).
  - Startpagina: `start.tipX`.
  - Projecten (sinds 1.6.0): `gww.projects`, een lijst `[{ v, id, nr, name, who, phone, note, lat, lon, addr, created, modified }]` (`who`, `phone` en `note` zijn sinds 1.8.0 optioneel, `lat`, `lon` en `addr` sinds 1.16.0). Wordt gevuld met een kopie van `locdelen.projects`; die laatste wordt er niet door gewijzigd. Locatie delen en Route knijperwagen lezen de lijst alleen om een project te kiezen.
  - Synchronisatie: `gh-sync-config`.
  - Grafstenen (sinds 1.12.0): `gww.tombstones`, `{ documentsleutel: tijdstip }` voor verwijderde projecten en logregels, nodig om verwijderingen te synchroniseren; na 90 dagen opgeruimd.
  - Logboek (sinds 1.9.0): `gww.log`, een lijst `[{ v, id, projectId, date, work, equipment, created, modified }]` plus sinds 1.13.0 optioneel `other`, `crew`, `machines`, `stagnation`, `deliveries`, `extra`, `safety` en `weather`: één regel per project en dag, `projectId` verwijst naar het `id` in `gww.projects`. Wordt sinds 1.12.0 gesynchroniseerd.
  - Foto's (sinds 1.10.0): IndexedDB-database `gww-photos`, store `photos`, records `{ v, id, projectId, date, day, blob, w, h, lat, lon, created }` (`day` is `projectId|datum`). Alleen op het apparaat.
- Het syncformaat: `data/<tool>.json` met `{v:1, docs}` en `data/LEESMIJ.md`. Bestanden: `locatie.json`, `route.json`, en sinds 1.12.0 `projecten.json` (documenten `projects/<id>`) en `logboek.json` (documenten `log/<project-id>/<datum>`).
- De koppellink (`#koppel=` met `{r,t}`) en het formaat van `vault.json`.

Dit valt er niet onder: interne code en CSS, teksten en layout, de tests, `visie.html`, het cache-id, de weergave van het versienummer en externe diensten.

- **Adres:** het Pages-adres volgt de reponaam en wordt niet als blijvend contract vastgelegd. Een adreswijziging is een aparte migratie.
- **Compatibiliteit:** nieuwe versies blijven bestaande gegevens (formaat v1) ondersteunen. Er is geen belofte dat oude apps toekomstige schema's veilig verwerken; schrijven blokkeren bij een onbekende schemaversie is een aparte, latere wijziging.

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
| PDOK Locatieserver | adres zoeken en het dichtstbijzijnde adres bij een pin (Nederland), ook voor het adres op logboekfoto's |
| PDOK luchtfoto (`luchtfotorgb`), BRT-achtergrondkaart, kadastrale kaart, bestuurlijke gebieden | luchtfoto, kaart, perceelgrenzen en gemeentegrens |
| Esri World Imagery en Transportation | luchtfoto buiten Nederland en straatnamen op de luchtfoto |
| GitHub API (alleen als je synchroniseren aanzet) | je gegevens bewaren in je eigen privérepo |
| OpenStreetMap (tegels en Nominatim) | kaart en adressen buiten Nederland, en als terugval |
| cdnjs | Leaflet |
| Open-Meteo | weer rond 12:00 in het logboek (alleen de coördinaten van de projectlocatie, anders van een foto of van het toestel, en de datum gaan mee; zonder bereik vul je het zelf in) |
| jsDelivr | jsPDF (PDF-bibliotheek voor het dagrapport, versie vastgezet) |

Er zijn geen trackers, cookies of accounts. Naam en telefoonnummer van de afzender blijven op het apparaat en komen alleen in het bericht en de afbeelding die je zelf verstuurt. De diensten hierboven ontvangen alleen de coördinaten, zoekopdrachten en tegelverzoeken die nodig zijn voor de kaart.

## Bekende beperkingen

- Foto's in het logboek staan alleen op het toestel (niet gesynchroniseerd). Een webapp mag niet rechtstreeks in Foto's schrijven: bewaar een foto via het deelmenu ("Bewaar afbeelding") als je hem ook in Foto's wilt. Locatie en tijd op de stempel komen van het toestel; zonder locatietoestemming staat er "Locatie onbekend", en zonder bereik ontbreken het adres en het kaartje.
- Zonder synchronisatie worden gegevens per apparaat en per browser bewaard. Op een iPhone zijn Safari en de app op het beginscherm gescheiden; gebruik daarom altijd de app op het beginscherm.
- Korte Google Maps-links (`maps.app.goo.gl`) kunnen alleen worden gelezen met behulp van gratis tussendiensten van derden en werken daarom niet altijd. Een volledige link, de coördinaten of het adres werken altijd.
- Delen van de afbeelding gebruikt het deelmenu van het toestel. Wordt dat geblokkeerd, dan wordt de afbeelding opgeslagen en het bericht gekopieerd.

## Problemen oplossen

- **Oude versie zichtbaar:** sluit de app, open hem opnieuw en vernieuw. Staat het versienummer in het tandwiel nog niet goed, verwijder dan het icoon en voeg de pagina opnieuw toe.
- **Kaart blijft leeg:** controleer de verbinding. Valt een kaartbron uit, dan schakelt de tool zelf over op een reservekaart en meldt dat.
- **Een fout in beeld:** de tool toont onderin kort "Fout: …". Noteer de tekst en het versienummer.

## Een nieuwe tool toevoegen aan de startpagina

1. Maak het bestand (bijvoorbeeld `nieuw.html`) met `shared.css` erin, zoals `route.html`.
2. Zet een regel bij in `TOOLS` in `nav.js`: de tool komt dan vanzelf in de onderbalk en op de startpagina. Laad `version.js` en `nav.js` in de pagina, zoals in `projecten.html`.
3. Zet het bestand en eventuele iconen in `LOCAL` in `sw.js` en verhoog `CACHE`.
4. Voeg de pagina toe aan `tests/nav.test.js` (`want`) en de verwachte tegels in `tests/start.test.js`.
