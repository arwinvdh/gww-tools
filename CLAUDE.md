# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Werkwijze

- Antwoord in het Nederlands, kort en praktisch. De eigenaar heeft basiskennis van techniek: leg vaktermen kort uit.
- Bouw klein en gericht. Toekomstwensen zijn geen bouwopdracht.
- Bij een audit of onderzoek: niets wijzigen zonder vervolgopdracht.
- Bij een bouwopdracht: blijf binnen de afgesproken scope. Overleg eerst bij ingrijpende of onverwachte wijzigingen.
- Behoud bestaande functionaliteit en bestaande gebruikersgegevens.
- Wijzig opslag, synchronisatie (`sync.js`) of gegevensformaten niet zonder eerst de gevolgen en een eventuele migratie te bespreken.
- Gebruik de bestaande aanpak, tenzij de opdracht een wijziging vereist.
- Na een bouwopdracht doe je zelf het git-werk: committen, pushen, pull request openen en samenvoegen naar `main`, zonder te vragen. De eigenaar is niet technisch en wil snel resultaat. Meld alleen het nieuwe versienummer en wat er veranderd is. Tags maak je alleen op verzoek.
- Zet geen tokens, pincodes of andere geheimen in bestanden of antwoorden.

## Waar staat wat

- `README.md`: beschrijving van de tools, synchroniseren, pincode, uitrollen en de checklist voor een nieuwe tool. Bron voor hoe het werkt.
- `tests/README.md`: wat de tests controleren en hoe je ze toevoegt.
- `visie.html` beschrijft de projectrichting en mogelijke uitbreidingen. De pagina bevat zowel uitgangspunten als onbevestigde voorstellen. Behandel een voorstel niet automatisch als goedgekeurde eis. Vraag bij twijfel om bevestiging voordat je erop voortbouwt.

## Taal in de code

- Nieuwe functie- en variabelenamen in het Engels, in camelCase. Volg bij bestaande code de naamgeving die er staat.
- Comments en documentatie in het Nederlands. Teksten op het scherm in het Nederlands.
- Hernoem of vertaal bestaande code niet alleen om de taal gelijk te trekken.
- Hernoem of vertaal opslagsleutels, JSON-velden en externe koppelingen niet zonder expliciet akkoord. Dit komt bovenop de regel over opslag en gegevensformaten onder Werkwijze.

## Bouwprincipes

Deze principes gelden voor nieuwe en gewijzigde code. Ze zijn geen opdracht om bestaande code preventief te verbouwen.

- Voeg geen framework, dependency of extra architectuurlaag toe zonder concrete noodzaak en overleg.
- Dit is een statische site: publiek uitgeleverde bestanden mogen geen onversleutelde geheimen bevatten. Behandel versleutelde bestanden niet automatisch als veilig; bespreek wijzigingen aan de beveiligingsopzet vooraf.
- Bekijk bij wijzigingen aan opgeslagen gegevens ook de gevolgen voor bestaande data, synchronisatie en oudere appversies. Spreek zo nodig eerst een migratie af (dit vult de regel over opslag onder Werkwijze aan).
- Houd nieuwe en gewijzigde code overzichtelijk: geef functies een duidelijke verantwoordelijkheid en scheid weergave, inhoudelijke logica en opslag waar dat praktisch helpt. Dit verplicht niet tot aparte bestanden of een buildstap.
- Gebruik voor nieuwe gegevens waarnaar blijvend wordt verwezen een stabiele id, onafhankelijk van wijzigbare namen. Dit verandert geen bestaande projectsleutels en bepaalt niet of tools een projectlijst delen.
- Leg het waarom van niet-vanzelfsprekende keuzes kort vast (in comments, zie Taal in de code). Houd `README.md` actueel bij wijzigingen aan gebruik, synchronisatie of installatie.

## Tests

Er is geen build en geen lint. Elke tool is één HTML-bestand plus `shared.css`; de tests zijn de controle.

```bash
cd tests
npm install     # eenmalig; node_modules staat niet in de repo
npm test        # alle testbestanden na elkaar, duurt enkele minuten
node start.test.js   # één testbestand (elk bestand eindigend op .test.js werkt zo)
```

- Een geslaagde controle begint met `OK`, een mislukte met `FOUT`. Zoek daarop, niet op "FAIL".
- De tests openen de pagina's offline als `file://` in Chromium, met een nagebootste GitHub (`mock-github.js`). Ze raken geen echte GitHub of token.
- `npm test` heeft naast `npm install` een beschikbare Chromium nodig. `tests/README.md` noemt daarvoor `npx playwright install chromium`.
- Staat Chromium ergens anders, dan wijs je ernaar met de omgevingsvariabele `PW_CHROMIUM`, bijvoorbeeld `PW_CHROMIUM=/pad/naar/chromium npm test`. Dit hangt van de omgeving af, het is geen projectvereiste. Voorbeeld voor de huidige cloudomgeving: `PW_CHROMIUM=/opt/pw-browsers/chromium npm test`; installeer daar geen Playwright of browser opnieuw.
- Draai de tests die bij je wijziging horen. Bij een wijziging aan gedeelde code (`shared.css`, `sync.js`, `sw.js`) de hele suite.
- Zeg per resultaat wat wel en niet is getest. De tests lopen in Chromium met een nagebootste GitHub. Safari op een echte iPhone, de echte GitHub-koppeling, de live site en de pincode op een echt apparaat zijn daarmee niet gecontroleerd.

## Versies en caching

- Het appversienummer staat alleen in `version.js` (`APP_VERSION`, SemVer). `index.html`, `route.html` en `start.html` tonen het; geen pagina heeft een eigen versienummer. Een wijziging met gevolgen voor de app krijgt een nieuwe versie, een sectie in `CHANGELOG.md` en een hoger `CACHE`; docs- of testwijzigingen niet. Een nummer wordt nooit hergebruikt.
- `sw.js` heeft `CACHE` en `LOCAL`. Volgens de README verhoog je `CACHE` na een wijziging aan `index.html`, `route.html`, `sync.js`, `shared.css`, iconen of manifesten, en bij een nieuw bestand in `LOCAL`. De README noemt `start.html`, `vault.html` en `visie.html` daarbij niet: beoordeel dan eerst hoe de cache voor die wijziging werkt voordat je `CACHE` wel of niet verhoogt.
- Pagina's, manifesten, scripts en stijl worden eerst via het netwerk geladen en vallen na 4 seconden of zonder verbinding terug op de bewaarde kopie. Het effect van een vergeten `CACHE` merk je dus vooral offline of bij slecht bereik.
- Een nieuw bestand moet in `LOCAL` in `sw.js`; de checklist voor een nieuwe tool staat in de README.

## Conventies voor commits en branches

- Commits volgens Conventional Commits: Engelse type (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`) met een Nederlandse omschrijving, bijvoorbeeld `fix(sw): beperk cacheopruiming tot de eigen app`.
- Korte taakbranches met een beschrijvende naam, geen projectnaam en geen branch per tool.
- Wijzigingen gaan via een pull request naar `main`; niet rechtstreeks pushen. Voeg zelf samen als de tests groen zijn.
- Maak geen tag (`vX.Y.Z`) zonder opdracht van de eigenaar.
