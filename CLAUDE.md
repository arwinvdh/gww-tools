# GWW Tools

Statische webapp-suite voor de GWW-uitvoering (Locatie delen, Route, Projecten, Logboek). Eén HTML-bestand per tool plus `shared.css`, geen build, geen framework, geen eigen backend.
Hoe het werkt (tools, synchroniseren, pincode, uitrollen, opslagsleutels, checklist nieuwe tool): `README.md`. Lees dat eerst; geen tweede handboek hier.
Vormgeving: `DESIGN.md` (lees vóór elke wijziging aan de vormgeving). Tests: `tests/README.md`.
Projectrichting: `visie.html` bevat uitgangspunten én onbevestigde voorstellen. Een voorstel is geen eis; vraag bij twijfel om bevestiging.

## Commando's
Er is geen build en geen lint; de tests zijn de controle.
- `cd tests && npm install`: eenmalig (`node_modules` staat niet in de repo). Chromium: `npx playwright install chromium`.
- `npm test`: alle testbestanden, duurt enkele minuten. `node <naam>.test.js`: één testbestand.
- Chromium elders? Dan `PW_CHROMIUM=/pad/naar/chromium npm test`. In de cloudomgeving: `PW_CHROMIUM=/opt/pw-browsers/chromium npm test`; installeer daar geen Playwright of browser opnieuw.
- Resultaat: een geslaagde controle begint met `OK`, een mislukte met `FOUT`. Zoek daarop, niet op "FAIL".
- Draai de tests die bij je wijziging horen. Bij gedeelde code (`shared.css`, `sync.js`, `sw.js`) de hele suite.
- Bekende uitzonderingen: `robuust.test.js` duurt ~230 s (grens in `run-all.js` is 240 s; draai hem los als hij faalt) en `route-stops.test.js` is af en toe onbetrouwbaar.

## Structuur
- Pagina's in de hoofdmap: `index.html` (Locatie delen), `route.html`, `projecten.html`, `logboek.html`, `start.html`, `vault.html`, `visie.html`.
- Gedeeld: `shared.css` (één stijlbron), `sync.js` (GitHub-synchronisatie), `datasync.js` (samenvoegen van Projecten en Logboek), `nav.js` (onderbalk), `version.js` (enige bron van `APP_VERSION`), `sw.js` (service worker, offline).
- `tests/`: Playwright-tests op `file://` met een nagebootste GitHub (`mock-github.js`). `icons/`, manifesten, `CHANGELOG.md`.
- Een nieuw bestand hoort in `LOCAL` in `sw.js`; de checklist voor een nieuwe tool staat in `README.md`.

## Grenzen
- Geen tokens, pincodes of andere geheimen in bestanden of antwoorden. Publiek uitgeleverde bestanden bevatten geen onversleutelde geheimen; behandel versleutelde bestanden niet automatisch als veilig en bespreek wijzigingen aan de beveiligingsopzet vooraf.
- Wijzig opslag, synchronisatie (`sync.js`, `datasync.js`) of gegevensformaten niet zonder eerst de gevolgen en een eventuele migratie te bespreken. Kijk ook naar bestaande data, synchronisatie en oudere appversies.
- Hernoem of vertaal geen opslagsleutels, JSON-velden of externe koppelingen zonder expliciet akkoord. Een nieuwe sleutel alleen na akkoord en met een regel in `README.md`.
- Behoud bestaande functionaliteit en bestaande gebruikersgegevens.
- Geen framework, dependency of extra architectuurlaag zonder concrete noodzaak en overleg.
- Bouw klein en gericht; toekomstwensen zijn geen bouwopdracht. Bij een audit of onderzoek: niets wijzigen zonder vervolgopdracht. Overleg eerst bij ingrijpende of onverwachte wijzigingen.
- Na twee mislukte pogingen met dezelfde aanpak: stoppen, diagnose en alternatief geven.
- Meld welke controles niet zijn uitgevoerd. De tests lopen in Chromium met een nagebootste GitHub: Safari op een echte iPhone, de echte GitHub-koppeling, de live site en de pincode op een echt apparaat zijn daarmee niet gecontroleerd.

## Conventies
- Nederlandse comments, documentatie en schermteksten. Nieuwe functie- en variabelenamen in het Engels, camelCase; volg bij bestaande code de naamgeving die er staat en hernoem niet alleen om de taal gelijk te trekken.
- Statische site, mobile first (iPhone, één hand): tikdoelen minstens 44px; gebruik de variabelen en onderdelen uit `shared.css` en zet herbruikbare onderdelen daar, niet in een pagina.
- Gebruik voor nieuwe gegevens waarnaar blijvend wordt verwezen een stabiele id, onafhankelijk van wijzigbare namen.
- Houd nieuwe code overzichtelijk (duidelijke verantwoordelijkheid per functie) en leg het waarom van niet-vanzelfsprekende keuzes kort vast in een comment. Houd `README.md` actueel bij wijzigingen aan gebruik, synchronisatie of installatie. Dit is geen opdracht om bestaande code preventief te verbouwen.
- De eigenaar heeft basiskennis van techniek: antwoord kort en praktisch en leg vaktermen kort uit.

## Versies en caching
- `APP_VERSION` (SemVer) staat alleen in `version.js`; `index.html`, `route.html` en `start.html` tonen het. Een wijziging met gevolgen voor de app krijgt een nieuwe versie, een sectie in `CHANGELOG.md` en een hoger `CACHE` in `sw.js`. Docs- of testwijzigingen niet. Een nummer wordt nooit hergebruikt.
- Verhoog `CACHE` ook na een wijziging aan `index.html`, `route.html`, `logboek.html`, `projecten.html`, `sync.js`, `datasync.js`, `shared.css`, iconen of manifesten. Bij `start.html`, `vault.html` en `visie.html`: beoordeel eerst hoe de cache voor die wijziging werkt.
- Pagina's, manifesten, scripts en stijl worden eerst via het netwerk geladen en vallen na 4 seconden of zonder verbinding terug op de bewaarde kopie; een vergeten `CACHE` merk je dus vooral offline of bij slecht bereik.

## Git
- Commits volgens Conventional Commits: Engelse type (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`), Nederlandse omschrijving, bijvoorbeeld `fix(sw): beperk cacheopruiming tot de eigen app`.
- Korte taakbranches met een beschrijvende naam, geen projectnaam en geen branch per tool. Wijzigingen gaan via een pull request naar `main`; niet rechtstreeks pushen. Voeg zelf samen als de tests groen zijn.
- Na een bouwopdracht doe je zelf het git-werk (committen, pushen, pull request, samenvoegen) zonder te vragen; meld alleen het nieuwe versienummer en wat er veranderd is. Uitzondering: zegt de opdracht dat je eerst moet laten beoordelen, dan wacht je op akkoord.
- Maak geen tag (`vX.Y.Z`) zonder opdracht van de eigenaar.
