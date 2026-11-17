// Route knijperwagen: ruwe route plakken, Enter-toets tussen velden en uurchips.
const { chromium, launchOptions, offlinePage, ok } = require('./helpers.js');
const IPHONE = require('playwright').devices['iPhone 13'];
(async () => {
  const b = await chromium.launch(launchOptions());

  // --- plakken (zonder AI) ---
  let p = await offlinePage(b, IPHONE, 'route.html');
  const parse = (t) => p.evaluate((x) => parseRoute(x), t);
  let r = await parse('1. Laden bij R3S 6.00 -> 1 bigbag spramex\n2. Lossen in Berkel Rodenrijs (IB25060): 2 trilplaten, 1 bak zand');
  ok(r.length === 2 && r[0].acties[0] === 'LADEN' && r[0].plaats === 'R3S' && r[0].tijd === '6.00' && r[0].items[0] === '1 bigbag spramex', 'plakken: laadstop herkend (plaats, uur, items)');
  ok(r[1].acties[0] === 'LOSSEN' && r[1].project === 'IB25060' && r[1].plaats === 'Berkel Rodenrijs' && r[1].items.length === 2, 'plakken: losstop met projectnummer en twee items');
  r = await parse('1️⃣ Laden bij R3S om 6.00 uur\n1 bigbag Spramex\n2️⃣ Lossen aan de Leidsevaart IB24001 voor 9 uur - 10 klinkers\nhttps://maps.app.goo.gl/abc');
  ok(r.length === 2 && r[0].items[0] === '1 bigbag Spramex', 'plakken: regel zonder actie hoort bij de vorige stop');
  ok(r[1].voorz === 'aan de' && r[1].tijdv === 'voor' && r[1].tijd === '9.00' && r[1].link.startsWith('https://maps'), 'plakken: voorzetsel, voor-tijd en link');
  r = await parse('laden en lossen in Utrecht om 11 uur -> kratten');
  ok(r[0].acties.join() === 'LADEN,LOSSEN', 'plakken: laden en lossen op een plek');
  ok((await parse('gewoon wat tekst')).length === 0, 'plakken: tekst zonder acties geeft geen stops');
  await p.click('#paste-toggle'); await p.fill('#paste-text', '1. Laden bij R3S 6.00 -> 1 bigbag'); await p.click('#paste-go'); await p.waitForTimeout(300);
  ok(await p.locator('.stop').count() === 1 && /R3S/.test(await p.textContent('#bubble')), 'plakken: stops staan in het formulier en het bericht');
  ok(p.errs.length === 0, 'plakken: geen scriptfouten ' + p.errs.join('|'));
  await p.context().close();

  // --- Enter-toets en uurchips ---
  p = await offlinePage(b, IPHONE, 'route.html');
  const act = () => p.evaluate(() => document.activeElement.dataset.f || document.activeElement.id);
  const next = () => p.locator('[data-do=next]:visible').first().click();
  await p.fill('#s1-plaats', 'Nieuwplaats'); await p.press('#s1-plaats', 'Enter');
  ok(await act() === 'project', 'Enter bij nieuwe plaats gaat naar Project');
  await p.fill('#s1-project', 'IB25060'); await p.fill('#s1-tijd', '7.15'); await p.fill('#s1-items', '1 bigbag');
  await p.click('#copy'); await p.waitForTimeout(300);
  await next(); await p.waitForTimeout(300);
  await p.fill('#s2-plaats', 'Berkel'); await p.fill('#s2-tijd', '7.15'); await p.fill('#s2-items', 'x');
  await p.click('#copy'); await p.waitForTimeout(300);
  await next(); await p.waitForTimeout(300);
  await p.fill('#s3-plaats', 'Nieuwplaats'); await p.press('#s3-plaats', 'Enter');
  ok(await act() === 'items' && await p.inputValue('#s3-project') === 'IB25060', 'Enter bij bekende plaats vult project in en gaat naar Items');
  await p.focus('#s3-tijd'); await p.waitForTimeout(200);
  const chips = await p.evaluate(() => [...document.querySelectorAll('.stop.open .sugg:not([hidden]) .chip')].map(c => c.textContent));
  ok(chips.includes('7.15') && chips.length === 5, 'uurchips bevatten je eigen uur (' + chips.join(' ') + ')');
  ok(p.errs.length === 0, 'Enter/uurchips: geen scriptfouten');
  await b.close();
})();
