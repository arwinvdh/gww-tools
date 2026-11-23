# Changelog

Alle noemenswaardige wijzigingen per versie. Formaat volgt [Keep a Changelog](https://keepachangelog.com/nl/1.1.0/), versies volgen [SemVer](https://semver.org/lang/nl/).

## [1.24.0] - 2026-11-23

Technische kwaliteitsronde: opslag, synchronisatie, offline, PDF, toegankelijkheid en veilige zones onderzocht en met nieuwe tests vastgelegd. Gegevensformaten zijn ongewijzigd.

- Kapotte of vreemde opslag: Locatie delen, Projecten en Logboek gaven een scriptfout en een lege pagina als de lijst met projecten of logboekregels geen lijst was of lege regels (`null`) bevatte. Alleen bruikbare regels worden nu gelezen; de gegevens zelf worden niet aangepast of gewist.
- Opslag die niet werkt (vol of uitgezet): Locatie delen en Route tonen nu een blijvende melding bovenaan dat bewaren niet lukt (eerder stil). Projecten zegt niet meer "Project toegevoegd" als bewaren mislukt en wist het formulier dan niet. Verbinden voor synchronisatie meldt dat de koppeling niet bewaard kan worden, in plaats van na herladen ontkoppeld te zijn.
- PDF-rapporten: tekens buiten Latijns-1 (zoals Ł, ń, ć, ś uit Poolse bedrijfsnamen) kwamen als rommel in het dag- en weekrapport ("ZakBad Aódz"). Nu worden ze de gewone letter (Łódź wordt Lódz) en vallen emoji en symbolen weg. Alleen de PDF verandert, niet de ingevoerde tekst.
- Een kapot adres in het Logboek (`#/p/%E0%A4%A`) gaf een scriptfout; nu een onbekend project.
- Veilige zone: de pincodepagina en de visiepagina begonnen onder de notch; nu net als de rest. 
- Toegankelijkheid: het zoekveld voor de projectlocatie heeft een label en de meldingen (zoekmelding en toasts) worden door een schermlezer voorgelezen. Meldingen bij Nieuw project staan nu bij de knop en niet onderaan de pagina.
- Nieuwe tests: `robuust` (kapotte en geblokkeerde opslag, ongeldige adressen), `behoud` (alleen kijken wijzigt niets; oude formaten; foto's), `sync-storing` (storing, geen verbinding, ingetrokken token, kapot bestand, gelijktijdige wijzigingen en verwijderingen, samenvoegregels), `offline-bibliotheken` (alle pagina's, Leaflet en jsPDF offline; nieuwe versie vervangt de oude kopie), `pdf-tekens` (bijzondere tekens, veel regels, dag- en weekrapport), `veilige-zone` (notch en zijranden, nagebootst) en `toegankelijkheid` (namen, labels, live-meldingen, Esc en focus), `flows-zonder-fouten` (geen scriptfouten of onbehandelde beloften zonder internet of toestemming).

## [1.23.0] - 2026-11-23

- Ontwerpronde over alle tools; geen nieuwe huisstijl. Nieuw: `DESIGN.md` met de ontwerpafspraken (variabelen, gedeelde onderdelen, regels bij een wijziging), verwezen vanuit `CLAUDE.md` en `README.md`.
- Gedeeld in `shared.css` in plaats van per pagina: chip (met gekozen en voorstel), uitklapbare sectie (`.sec`), checkbox met label, lege toestand, lijst, invoerregel, melding met streep (`.callout`, groen of rood) en een vaste actierij voor dialogen (`.dlg-actions`). De veilige zone bovenaan stond drie keer los in de pagina's en staat nu één keer in `shared.css`.
- Dubbele en tegenstrijdige regels weggehaald: drie versies van de chip (36, 40 en 44 px), twee van de checkbox, drie meldingsstijlen (`.ctx`, `.copynote`, `.pend`), twee lijst- en invoerregels, een dubbele kleur voor knoplinks en een dubbele dialoogtitel.
- Variabelen overal: afrondingen en tekstmaten staan als `--radius-*` en `--text-*`, met een nieuwe `--text-label` (13 px) en `--chip-h`. Knoppen zijn nu 12 px afgerond, net als velden.
- Dialogen: dezelfde opbouw. Gevaarlijke actie links, daarna secundair, de hoofdactie als laatste (Weekrapport en foto). Dialogen, lijsten en uitklappers komen zonder animatie in beeld.
- Toegankelijkheid: de link in het WhatsApp-voorbeeld heeft nu voldoende contrast, de kleine verwijderknop is op touch 44 px breed, het datumveld heeft een duidelijke focusring en de losse link op de pincodepagina is 44 px hoog.
- Nieuwe controle `design.test.js`: gedeelde onderdelen niet opnieuw gedefinieerd, geen losse radius-waarden of decoratieve animaties, contrast, tikdoelen, toetsenbordfocus en geen zijwaartse scroll op 375, 390, 430, 768, 1024 en 1440 px.
- Gegevens, opslag, synchronisatie en functies zijn ongewijzigd.

## [1.22.0] - 2026-11-23

- Route knijperwagen: de kop van een ingeklapte stop heeft twee regels. Bovenaan de actie als gekleurd label (laden, lossen, ophalen) met de plaats, daaronder het uur, het project en het eerste item met het aantal overige (`+2`). Elke stop heeft links een streep in de kleur van de eerste actie. Een onvolledige stop toont in rood wat ontbreekt. De koppen blijven compact (ongeveer 58 px), ook bij een route van 15 stops.
- Meldingen: een tijd die niet bestaat (bijvoorbeeld 27.90) wordt gemeld. In Bericht is elke opmerking over een stop een knop die terug naar de invoer springt, de stop opent en de cursor in het veld zet dat ontbreekt. Kopiëren blokkeert niet, maar meldt nu het aantal opmerkingen.
- Verplaatsen: naast slepen aan het nummer en de pijltjes in de geopende stop kan het nu ook met het toetsenbord (Alt + pijl omhoog of omlaag op de kop, ook ingeklapt). Bij drie of meer stops staat er een korte uitleg onder Stops.
- Op de telefoon staan de drie routeknoppen op één rij en datum en opmerking naast elkaar (vanaf 352 px), zodat de eerste stop eerder in beeld komt.
- Het bericht, de acties (laden, lossen, ophalen), de opslag en de synchronisatie van routes zijn ongewijzigd; stops worden nooit automatisch herordend.

## [1.21.0] - 2026-11-23

- Locatie delen: onder de kaart staat een samenvatting van wat er gedeeld wordt: de pin (coördinaten uit de kaart), het adres (gevonden bij de pin of zelf ingevuld, of de melding dat er geen adres is) en de soort link in het bericht. Aanpassen springt naar het adresveld. De losse coördinaten naast de kaartlaag-knoppen zijn daarin opgegaan.
- Na zoeken, kiezen of Mijn locatie blijft de kaart op de telefoon in beeld (samen met de samenvatting, boven de actiebalk), zodat je de pin kunt controleren. Voorheen scrolde de pagina naar het projectveld en verdween de kaart. Op desktop blijft de cursor naar het projectveld gaan. De kaart is op de telefoon lager (38% van het scherm, tussen 220 en 340 px), zodat hij op een kleine iPhone boven de actiebalk past. De zoekresultaten scrollen in beeld.
- Duidelijker meldingen: geen verbinding (zoeken en adres opzoeken), niets gevonden (noemt de zoekopdracht), te korte zoekopdracht, ongeldige coördinaten (met het toegestane bereik), adres wordt opgezocht en bij een pin zonder adres de uitleg dat pin en link wel kloppen. Mijn locatie toont een draaiende ring, de nauwkeurigheid in meters (met een waarschuwing boven 50 m) en per fout (geen toestemming, niet te bepalen, te traag) wat je kunt doen.
- Zoekresultaten zijn minstens 44px hoog. De knop Deel afbeelding past op één regel op 375 px en breder. De foutmelding bij een onbereikbare kaart noemt het alternatief (alleen de tekst delen). Het bericht in het voorbeeld heeft iets meer regelhoogte en tekstgrootte.
- Het bericht zelf, de coördinaten, adressen, projectgegevens en alle deelacties zijn ongewijzigd.

## [1.20.0] - 2026-11-23

- Logboek, dagregistratie: aantal personen en uren staan als invulveld in de regel zelf (personeel, materieel en stagnatie). Een waarde aanpassen na het overnemen van de vorige dag kost één tik, in plaats van de regel verwijderen en opnieuw invoeren. Het veld houdt de cursor tijdens het typen.
- Samenvatting onder elke sectietitel, ook als die ingeklapt is: personen en manuren (zoals het weekrapport ze telt, alleen waar uren zijn ingevuld), aantal machines en uren, stagnatieuren, leveringen, meerwerk, veiligheid en het aantal foto's. Foto's is nu een sectie. Bovenaan de dag staat dezelfde regel in één oogopslag, ook in de dagenlijst (met de eerste regel werkzaamheden) en in het weekrapportvenster (zeven dagen met cijfers of geen invoer).
- Bewaarstatus: Automatisch bewaard om 14:32 (of de datum als dat een andere dag was), en Wordt automatisch bewaard zodra je iets invult op een lege dag. Een mislukte opslag staat in rood.
- Zelfde als vorige dag: werkt ook als alleen personeel of alleen materieel nog leeg is (overschrijft nooit iets), noemt wat er wordt overgenomen, toont na afloop een melding om aantallen en uren te controleren en heeft Ongedaan maken.
- Half ingevulde regels (getypt maar niet toegevoegd) zijn zichtbaar bij de sectie en in de samenvatting. Opslaan en terug, Vorige dag en Volgende dag waarschuwen daar eerst een keer voor; de tweede tik gaat door. De toevoegvelden worden leeg bij een andere dag.
- Dagnavigatie: de knoppen noemen de dag waar ze heen gaan.
- Geen wijzigingen aan de PDF-rapporten, het opslagformaat (`gww.log`) of de foto's; er zijn geen nieuwe verplichte velden.

## [1.19.0] - 2026-11-23

- Projecten: de lijst staat bovenaan zodra er projecten zijn (het formulier Nieuw project daaronder) en toont per project nummer, naam en locatie, of Geen locatie.
- Projectvenster opnieuw opgebouwd: op de telefoon schermvullend (op tablet en desktop een venster van hoogstens 34rem), met een kop met het actieve project en zijn locatie, bovenaan Openen met dit project (Locatie delen, Route knijperwagen en Logboek met icoon), daaronder Projectgegevens, en Verwijderen apart onderaan. Opslaan (hoofdknop) en Sluiten staan in een vaste voet.
- De sluitknop heet Annuleren zodra er iets gewijzigd is en bewaart dan niets. Opslaan zonder nummer en naam geeft een melding in plaats van niets te doen. Verwijderen vraagt twee tikken binnen 4 seconden, daarna valt de knop terug.
- Toetsenbord: op de telefoon volgt het venster het zichtbare scherm, zodat de voet boven het toetsenbord blijft en het veld waarin je typt in beeld scrolt.
- Navigatie: het projectvenster heeft een adres (`projecten.html#p=<id>`). Terug uit een tool komt het project dus weer open; Project bewerken in het Logboek opent het project direct. Route toont het gekozen project blijvend boven de route.
- Knoppen die een link zijn (zoals Apple Maps en Waze) hebben nu dezelfde donkere tekst als andere knoppen in plaats van linkblauw.
- Opslag, project-id's, synchronisatie en `#gp=`-adressen zijn ongewijzigd.

## [1.18.0] - 2026-11-23

- Onderbalk: op tablet en desktop staan de tabs gegroepeerd in het midden in plaats van over de hele breedte uitgerekt.
- Locatie delen: het zoekveld staat op elke schermbreedte op een eigen rij (op tablet en desktop was het platgedrukt tot een paar letters); Mijn locatie blijft op één regel; de actiebalk breekt labels op desktop niet meer af en de labels zijn minstens 12px; op grote schermen (80rem en breder) is de pagina breder.
- Route knijperwagen: de drie knoppen bij Route verdelen de breedte op smalle schermen; de statusregel in de actiebalk heeft een groter tikvlak (de balk wordt niet hoger).
- Projecten: in het projectvenster is Opslaan nu de hoofdknop en zijn de drie tool-links secundair.
- Startpagina en synchronisatieblok: de links onder Apparaten koppelen en de uitklapper Hoe stel ik dit in? hebben een tikvlak van minstens 44px.
- Kaarten verschijnen direct zonder intreeanimatie.
- Opslag, synchronisatie en gegevensformaten zijn ongewijzigd.

## [1.17.0] - 2026-11-23

- Startpagina: tools staan als rij met icoon, naam en korte beschrijving (de hele rij is aanklikbaar). Nieuw: een compacte synchronisatiestatus met symbool en tekst (niet gekoppeld, gekoppeld, gesynchroniseerd om, mislukt); een tik opent de koppelgegevens. Zonder projecten en routes staat er een lege toestand met knoppen naar Projecten en Locatie delen.
- Locatie delen op desktop (breed en hoog scherm): de kaart blijft links in beeld, project en bericht staan rechts. Op mobiel is de volgorde ongewijzigd.
- `shared.css`: ontwerpwaarden (ruimte, afrondingen, tekstmaten, hoogte van knoppen, kleinste tikdoel) als variabelen, met dezelfde waarden als voorheen. Het uiterlijk van bestaande onderdelen verandert niet.
- Opslag en gegevensformaten zijn ongewijzigd.

## [1.16.0] - 2026-11-23

- Een project heeft nu een vaste locatie (lat, lon en adres, optioneel in `gww.projects`). Instellen in Projecten: huidige locatie, een adres zoeken (PDOK) of overnemen uit Locatie delen; wissen kan. Bij het eerste overnemen uit Locatie delen komt de locatie mee.
- Het weer in het logboek gebruikt eerst de locatie van het project, daarna de plek van een foto van die dag, daarna de positie van het toestel.
- Locatie delen opent vanuit een project met de pin op de projectlocatie en het adres ingevuld.

## [1.15.0] - 2026-11-23

- Weekrapport als PDF vanuit de dagen van een project: kies een week (maandag t/m zondag), met een weekoverzicht (weer, personen, stagnatie en foto's per dag), totalen van personeel en materieel per partner (manuren en uren), stagnatie per oorzaak, leveringen, meerwerk en veiligheid, en daarna per dag de werkzaamheden en overig. Foto's meenemen is een keuze bij het maken (standaard uit; ze worden verkleind).
- Dag- en weekrapport delen nu dezelfde opbouw.
- Opmaak: onder een foto in het rapport staat nu witruimte voor de volgende kop.

## [1.14.0] - 2026-11-23

- Logboek in drie lagen met eigen adressen: overzicht van projecten, de dagen van een project (met een samenvatting per dag: temperatuur, personen, stagnatie, meerwerk, incident en foto's) en één dag. Elke laag heeft een terugknop; de dag heeft een vaste balk met Opslaan en terug en Dagrapport PDF, vorige en volgende dag, en Dag verwijderen (met bevestiging).
- Nieuwe dag vandaag kiest eerst het project; zoeken bij meer dan 6 projecten. Vanuit Projecten opent het logboek de dagen van dat project.
- Automatisch bewaren blijft; de gegevens en het formaat zijn ongewijzigd.

## [1.13.1] - 2026-11-23

- Logboek: ingevoerde regels (personeel, materieel, stagnatie, leveringen) staan nu als gewone regels met de naam vet, de details eronder en een verwijderknop, in plaats van als afgeronde tags.

## [1.13.0] - 2026-11-23

- Logboek uitgebreid voor GWW: weer rond 12:00 (automatisch, aan te passen), personeel en materieel van partners (met aantallen en uren), stagnatie met oorzaak en uren, leveringen, meerwerk of afwijking en veiligheid (inklapbaar) en een veld Overig.
- "Zelfde personeel en materieel als vorige dag" met één tik, en voorstellen uit eerdere dagen met de laatst gebruikte aantallen en uren.
- Het dagrapport (PDF) bevat alle nieuwe onderdelen.
- Nieuwe velden zijn optioneel in `gww.log` en synchroniseren mee; oudere regels blijven geldig (het oude veld `equipment` blijft meegeschreven).
- Gefixt: bij een andere dag of project bleef oude tekst staan als de cursor nog in een tekstveld stond.

## [1.12.0] - 2026-11-23

- Projecten en Logboek synchroniseren tussen apparaten via dezelfde koppeling als Route en Locatie delen (`data/projecten.json` en `data/logboek.json`, formaat `{v:1, docs}`). Per project en per logregel wint de nieuwste wijziging; verwijderingen worden gedeeld (grafsteen, lokaal bewaard in `gww.tombstones`). Foto's blijven op het toestel.
- Projecten die je overneemt uit Locatie delen krijgen een id dat uit nummer en naam is afgeleid, en bij de eerste keer wordt eerst gesynchroniseerd, zodat twee apparaten geen dubbele projecten maken.
- Gefixt: Logboek en Projecten schrijven een dag of project alleen nog weg bij een echte wijziging; een nieuw tijdstip zonder wijziging kon bij synchroniseren de stand van een ander apparaat overschrijven.

## [1.11.0] - 2026-11-23

- Dagrapport als PDF vanuit het logboek: project, datum, uitvoerder en telefoon, projectnotitie, werkzaamheden, materieel en de foto's met stempel, op A4. De PDF-bibliotheek (jsPDF 4.2.1) wordt pas geladen als je een rapport maakt en door de service worker bewaard. Delen via het deelmenu (bijvoorbeeld naar Bestanden of Mail), anders een download.

## [1.10.1] - 2026-11-23

- Datumvelden blijven binnen hun kaart en staan links uitgelijnd op iPhone (het datumveld in het logboek liep over de rand).

## [1.10.0] - 2026-11-22

- Foto's in het logboek: Foto maken opent de camera; de foto krijgt een stempel met project, datum en tijd, adres, coördinaten en (online) een kaartje. De bewerkte foto staat op het toestel (IndexedDB `gww-photos`), per project en dag. Tik op een foto om hem te bekijken, in Foto's te bewaren via het deelmenu, of te verwijderen.

## [1.9.0] - 2026-11-22

- Nieuwe tegel Logboek: per project en dag werkzaamheden en materieel vastleggen. Het bewaart vanzelf, stelt eerder gebruikt materieel voor en toont de eerdere dagen van het project (`gww.log`, verwijst met het project-id naar de projectlijst). Te openen vanuit een project met de knop Logboek.

## [1.8.0] - 2026-11-22

- Werken vanuit Projecten: tik op een project en open Locatie delen of Route knijperwagen er direct mee. Een project heeft nu ook uitvoerder, telefoon en notitie (extra velden in `gww.projects`, bestaande projecten blijven geldig).
- Locatie delen opent dan met nummer, naam en notitie ingevuld en de uitvoerder en telefoon van het project in de velden; je eigen bewaarde gegevens blijven ongewijzigd. Route toont het project bovenaan de projectvoorstellen.

## [1.7.0] - 2026-11-22

- Project kiezen uit de lijst van de tegel Projecten: in Locatie delen met "Project kiezen" (vult projectnummer en naam in), in Route knijperwagen als voorstel bij het projectveld. Alleen lezen; er wordt niets extra bewaard en de bestaande gegevens blijven zoals ze waren.

## [1.6.0] - 2026-11-22

- Nieuwe tegel Projecten: een gedeelde projectlijst met een vast id per project (`gww.projects`). De eerste keer worden de projecten uit Locatie delen gekopieerd; Locatie delen zelf is niet gewijzigd. De tools kiezen later uit deze lijst.

## [1.5.0] - 2026-11-22

- Nieuwe look voor alle pagina's, bedoeld voor gebruik buiten: meer contrast, grotere tekst, hogere velden en knoppen (52 px), kopjes in gewone letters in plaats van kleine hoofdletters, vlakkere kaarten met grotere hoeken, onderbalk met groene markering voor de actieve tool.

## [1.4.0] - 2026-11-22

- Terugknop links in de kop van de tools: terug in de geschiedenis, zonder geschiedenis naar Home.
- De losse link "Alle tools" onderaan de tools is weggehaald; de Home-knop in de onderbalk vervangt hem.

## [1.3.0] - 2026-11-22

- Onderbalk met Home en een knop per tool in alle drie de pagina's (`nav.js`); de actiebalk en meldingen staan erboven.
- Startpagina als beginscherm: grote app-iconen met de naam eronder in plaats van kaarten, daaronder de laatste projecten en routes.

## [1.2.1] - 2026-11-22

- Startpagina overzichtelijker: recente projecten staan onder Locatie delen en recente routes onder Route knijperwagen, met een leesbare datum. De uitklapper voor koppelen is een stille tekstregel in plaats van een kaart.

## [1.2.0] - 2026-11-22

- Een tik op een recent project of een recente route op de startpagina laadt dat project of die route direct in de tool (via `#project=` en `#route=` in de link; alleen lezen).

## [1.1.1] - 2026-11-22

- Startpagina: de uitklapper heeft nu een pijltje en een kaartvorm, zodat zichtbaar is dat hij uitklapt.

## [1.1.0] - 2026-11-22

- Startpagina: de tools staan bovenaan, daaronder een lijst met recente projecten en routes (alleen lezen uit de bestaande opslag).
- Startpagina: koppelen, pincode en visie staan onder één uitklapper, zodat bijzaken niet in de weg zitten.

## [1.0.0] - 2026-11-22

- Eén appversie voor het hele project (`version.js`), zichtbaar in alle drie de pagina's.
- Het project heet GWW Tools; de startpagina en `start.webmanifest` dragen die naam.
- Eerder: index 2026.12.04-a, route 2026.11.27-a, start 2026.12.05-a.
