# Changelog

Alle noemenswaardige wijzigingen per versie. Formaat volgt [Keep a Changelog](https://keepachangelog.com/nl/1.1.0/), versies volgen [SemVer](https://semver.org/lang/nl/).

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
