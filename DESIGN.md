# Ontwerpafspraken

Compact naslagwerk voor de vormgeving. Eén stijlbron: `shared.css`. Pagina's (`<style>` in elk HTML-bestand) voegen alleen toe wat bij die pagina hoort. Geen eigen versie van een gedeeld onderdeel.

## Uitgangspunten

- Rustig en zakelijk: donkerblauw (merk), groen alleen als subtiel accent, witte kaarten met een dunne rand, lichtgrijze achtergrond. Geen gradients, geen decoratieve animaties.
- Mobile-first, met één hand en buiten bruikbaar: tikdoelen minstens 44px, contrast minstens 4,5:1 voor tekst, status nooit alleen met kleur (altijd ook tekst of symbool).
- Eén uitzondering op "rustig": de actiekleuren van Route (laden blauw, lossen groen, ophalen oranje) zijn functioneel.

## Waarden (variabelen in `shared.css`)

| Soort | Waarden |
|---|---|
| Kleur | `--bg`, `--surface`, `--ink`, `--ink-2` (secundaire tekst), `--line`, `--accent` (hoofdactie en gekozen), `--warn` (fout, verwijderen), `--ok`, `--brand-dark`, `--brand-green` |
| Ruimte | `--space-1` tot `--space-8` (4, 8, 12, 16, 24, 32 px) |
| Afronding | `--radius-sm` 8, `--radius-md` 12 (knop, veld, melding), `--radius-lg` 16 (kaart), `--radius-pill` |
| Tekst | `--text-xs` 12, `--text-label` 13, `--text-sm` 14, `--text-base` 16, `--text-lg` 17 (sectiekop), `--text-xl` 20 (paginatitel) |
| Hoogte | `--control-h` 52 (knop en veld), `--chip-h` 40, `--touch-min` 44 (kleinste tikdoel; kleine knoppen en chips worden dat op touch) |

Gebruik de variabelen in nieuwe regels, geen losse px of rem voor afronding en tekstmaat.

## Onderdelen

- Knop `.btn`: standaard secundair (witte vlak, rand). Hoofdactie `.btn.primary` (één per scherm of dialoog), verwijderen `.btn.danger`, klein `.btn.sm`. Knoppen die een link zijn (`a.btn`) zien er hetzelfde uit.
- Veld `.inp` met label in `.field > label`. Een veld heeft altijd een zichtbaar label of een `aria-label`.
- Kaart `.card` met `h2` als kop. Sectie binnen een kaart of pagina: `details.sec` (titel, samenvatting in `.sum`, `.secbody`).
- Melding: korte regel `.hint` (`.err`, `.ok`); melding met streep `.callout` (groen, informatie) of `.callout.warn` (rood, aandacht); tijdelijk bericht `.toast`.
- Chip `.chip`: aantikbaar voorstel of label. Gekozen is `aria-pressed="true"` (vol accent). Voorstel: `.chip.sug` (gestippeld).
- Selectie in een rij van opties: `.seg` (Locatie delen), `.acts` en `.tabs` (Route), allemaal vol accent voor de gekozen optie.
- Dialoog `<dialog>`: titel `h2`, onderaan `.dlg-actions` met links het gevaarlijke, dan het secundaire, de hoofdactie als laatste. Het projectvenster is op de telefoon schermvullend (`#dlg` in `projecten.html`).
- Navigatie: onderbalk `.appnav` (nav.js) en vaste actiebalk `.bar` erboven (`--nav-h`). Een terugknop staat links in de kop.
- Lijstregel: dunne scheidingslijn, geen kaart per regel. Lege toestand `.empty` met de volgende actie erbij.

## Bij een wijziging

1. Is het onderdeel herbruikbaar? Zet het in `shared.css`, niet in een pagina. Staat het er al, gebruik het.
2. Een afwijking per pagina mag alleen als het functioneel nodig is. Zet er een korte reden bij in een comment.
3. Controleer alle pagina's bij een wijziging aan `shared.css`: `npm test` (inclusief `design.test.js`) en kijk naar screenshots op 375, 390, 430, 768, 1024 en 1440 px.
4. Verhoog `CACHE` in `sw.js` en de versie, zoals in `CLAUDE.md`.

## Bewuste verschillen

- `.row` bestaat op twee plekken met een andere betekenis (Locatie delen: rij met velden, Projecten: lijstregel). Hernoem niet zonder de tests mee te nemen.
- Chips in het Logboek breken af (lange voorstellen), elders worden ze afgekapt.
- Op Home is Apparaten koppelen bewust een stille tekstregel, geen kaart.
- De actiekleuren van Route (zie boven).
