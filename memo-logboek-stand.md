# Memo: stand van zaken GWW Tools Logboek (25 nov 2026)

## Wat er is
- Statische webapp (HTML + `shared.css`), per tool één bestand. Logboek = `logboek.html`, in drie lagen: projecten, dagen van een project, één dag.
- Site: https://arwinvdh.github.io/gww-tools/ (Logboek: `/logboek.html`).
- Opslag in de browser (localStorage), optioneel gesynchroniseerd via een privé GitHub-repo (`datasync.js`). Foto's alleen op het toestel. PDF: dag- en weekrapport.
- Versie 1.27.0 is samengevoegd naar `main` (PR 33). Er is geen tag gemaakt.

## Opdracht en uitkomst
Doel: een normale werkdag in 60–120 s registreren, op iPhone, met één hand en zo weinig mogelijk toetsenbord.

Gebouwd in 1.27.0:
- Voorstellen per project (recent, vaak, andere projecten), één tik toevoegen.
- Overgenomen aantallen en uren zijn zichtbaar "eerder gebruikt" tot je ze bevestigt ("Alles klopt").
- Min/plus bij aantallen, uren-snelkeuzes, uren voor alle regels tegelijk (materieel per dag blijft ongemoeid).
- Regel bewerken, verwijderen met ongedaan maken.
- Werkzaamheden kiezen zonder toetsenbord; selectief overnemen uit een eerdere dag.
- Compactere schermopbouw; secties blijven open of dicht zoals gekozen.
- Concepten van half ingevulde regels (nieuwe sleutel `gww.logdraft`, alleen op het apparaat).
- Opslagfouten bij verwijderen netjes afgehandeld; twee dataverlies-risico's gerepareerd.

## Meting (geteld in een geautomatiseerde sessie; seconden zijn een rekenmodel)
| Scenario | Tikken | Toetsenbord | Geschat |
|---|---|---|---|
| A normale dag | 10 → 6 | 1 → 0 | 26 s → 9 s |
| B afwijkende dag | 16 → 18 | 3 → 2 | 56 s → 52 s |
| C uitgebreide dag | 14 → 15 | 1 → 1 | 34 s → 35 s |
| Eerste keer, geen historie | 65 → 49 | 2 → 3 | 165 s → 146 s |

Alleen de normale dag werd echt sneller. B en C kosten extra tikken door de controlestap en ingeklapte formulieren. Typen van nieuwe namen blijft de grootste tijdpost.

## Open punten
- Niet getest op een echte iPhone/Safari, echte GitHub-koppeling of live site.
- `datasync.js`: een mislukte schrijfactie naar localStorage tijdens samenvoegen merkt niemand. Niet aangepast, eerst bespreken.
- Foto's en uitzonderingssecties staan standaard dicht (één tik extra). Eventueel Foto's standaard open.
- "Eerder gebruikt"-markering synchroniseert niet tussen apparaten.
- Op 320 px staat de verwijderknop op een eigen regel.
- `route-stops.test.js` is al onbetrouwbaar (ook in de oude versie); `robuust.test.js` zit dicht tegen de 240 s-grens van `run-all.js`.

## Vragen om mee te sparren
- Is "Alles klopt" als bevestiging genoeg, of moet de controle lichter (bijv. stilzwijgend bij "Opslaan en terug")?
- Hoe krijgen we B en C echt sneller zonder niet-bevestigde waarden in te vullen?
- Wat moet er gebeuren voordat het bij collega's in gebruik gaat (echte iPhone-test, back-up, uitrol)?
