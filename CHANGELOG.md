# Changelog

Alle noemenswaardige wijzigingen per versie. Formaat volgt [Keep a Changelog](https://keepachangelog.com/nl/1.1.0/), versies volgen [SemVer](https://semver.org/lang/nl/).

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
