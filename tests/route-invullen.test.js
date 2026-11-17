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
  ok(await act() === 'items', 'Enter bij nieuwe laadplek gaat naar Items (project is bij laden niet nodig)');
  await p.fill('#s1-project', 'IB25060'); await p.fill('#s1-tijd', '7.15'); await p.fill('#s1-items', '1 bigbag');
  await p.click('#copy'); await p.waitForTimeout(300);
  await next(); await p.waitForTimeout(300);
  await p.fill('#s2-plaats', 'Berkel'); await p.press('#s2-plaats', 'Enter');
  ok(await act() === 'project', 'Enter bij nieuwe losplek gaat naar Project');
  await p.fill('#s2-tijd', '7.15'); await p.fill('#s2-items', 'x');
  await p.click('#copy'); await p.waitForTimeout(300);
  await next(); await p.waitForTimeout(300);
  await p.fill('#s3-plaats', 'Nieuwplaats'); await p.press('#s3-plaats', 'Enter');
  ok(await act() === 'items' && await p.inputValue('#s3-project') === '', 'Enter bij bekende laadplek gaat naar Items en vult geen project in');
  await p.focus('#s3-tijd'); await p.waitForTimeout(200);
  const chips = await p.evaluate(() => [...document.querySelectorAll('.stop.open .sugg:not([hidden]) .chip')].map(c => c.textContent));
  ok(chips.length === 5 && chips.every(c => parseFloat(c) > 7.15) && chips.includes('7.30'), 'uurchips schuiven mee: na 7.15 alleen latere tijden (' + chips.join(' ') + ')');
  ok(p.errs.length === 0, 'Enter/uurchips: geen scriptfouten');
  // projectvoorstel: het project van de vorige stop staat vooraan
  await p.fill('#s3-plaats', ''); await p.fill('#s3-project', '');
  await p.evaluate(() => { document.querySelector('[data-id="1"] [data-do=open]').click(); }); await p.waitForTimeout(300); await p.fill('#s1-project', 'IB11111');
  await p.evaluate(() => { document.querySelector('[data-id="2"] [data-do=open]').click(); }); await p.waitForTimeout(300); await p.fill('#s2-project', 'IB22222');
  await p.evaluate(() => { document.querySelector('[data-id="3"] [data-do=open]').click(); }); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('[data-id="3"] input[data-f="project"]').focus()); await p.waitForTimeout(200);
  const pc = await p.evaluate(() => [...document.querySelectorAll('.stop.open .sugg:not([hidden]) .chip')].map(c => c.textContent));
  ok(pc[0].startsWith('IB22222'), 'projectvoorstel: project van de vorige stop staat eerst (' + pc.join(' ') + ')');
  await p.evaluate(() => document.querySelector('[data-id="1"] [data-do=open]').click()); await p.waitForTimeout(300);
  await p.fill('#s1-tijd', ''); await p.focus('#s1-tijd'); await p.waitForTimeout(200);
  const first = await p.evaluate(() => [...document.querySelectorAll('.stop.open .sugg:not([hidden]) .chip')].map(c => c.textContent));
  ok(first.includes('7.15') && first.length === 5, 'eerste stop: uurchips uit eigen gebruik (' + first.join(' ') + ')');

  // --- slimme voorstellen met een gezaaid geheugen ---
  const { ROOT, LEAFLET_JS, LEAFLET_CSS } = require('./helpers.js');
  const ctx = await b.newContext(IPHONE);
  const now = Date.now(), day = 864e5;
  await ctx.addInitScript(([now, day]) => {
    if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', '1');
    localStorage.setItem('knijperwagen-mem-v2', JSON.stringify({
      places: {
        'r3s': { p: 'R3S', pr: 'IB25060', l: '', n: 40, t: now - 6 * day, a: { LADEN: 40, LOSSEN: 0, OPHALEN: 0 }, nx: { 'berkel rodenrijs': 30, 'gouda': 2 }, tm: '6.00' },
        'berkel rodenrijs': { p: 'Berkel Rodenrijs', pr: 'IB25060', l: '', n: 25, t: now - 6 * day, a: { LADEN: 0, LOSSEN: 25, OPHALEN: 0 }, nx: {}, tm: '7.30' },
        'gouda': { p: 'Gouda', pr: 'IB24001', l: '', n: 1, t: now - 1 * day, a: { LADEN: 0, LOSSEN: 1, OPHALEN: 0 } },
        'zoetermeer': { p: 'Zoetermeer', pr: 'IB23007', l: '', n: 2, t: now - 2 * day, a: { LADEN: 0, LOSSEN: 2, OPHALEN: 0 } }
      },
      items: [
        { t: '1 bigbag Spramex', p: 'zoetermeer', ts: now - 2 * day }, { t: '2 bigbag Spramex', p: 'r3s', ts: now - 6 * day },
        { t: '2 trilplaten', p: 'berkel rodenrijs', ts: now - 6 * day }, { t: '1 bak zand', p: 'gouda', ts: now - 1 * day }
      ]
    }));
  }, [now, day]);
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  const q = await ctx.newPage(); q.errs = []; q.on('pageerror', e => q.errs.push(e.message));
  await q.goto(ROOT + 'route.html'); await q.waitForTimeout(600);
  await q.evaluate(() => { document.getElementById('tip').hidden = true; });
  const chipsOf = async (sel) => { await q.evaluate((x) => document.querySelector(x).focus(), sel); await q.waitForTimeout(200); return q.evaluate(() => [...document.querySelectorAll('.stop.open .sugg:not([hidden]) .chip')].map(c => c.textContent)); };
  let c = await chipsOf('#s1-plaats');
  ok(c[0].startsWith('R3S'), 'plaats: vaste laadplek staat boven eenmalige plaatsen (' + c.join(' | ') + ')');
  await q.fill('#s1-plaats', 'R3S'); await q.press('#s1-plaats', 'Enter');
  ok(await q.inputValue('#s1-project') === '', 'laden: project wordt niet automatisch ingevuld');
  await q.fill('#s1-tijd', '6.00'); await q.fill('#s1-items', '2 bigbag Spramex');
  await q.locator('[data-do=next]:visible').first().click(); await q.waitForTimeout(300);
  c = await chipsOf('#s2-plaats');
  ok(c[0].startsWith('Berkel') && !c[0].startsWith('R3S'), 'plaats: na R3S komt wat er vorige keer volgde (' + c.join(' | ') + ')');
  c = await chipsOf('#s2-project');
  ok(c[0] === 'IB25060 · R3S' || c[0].startsWith('IB25060'), 'project: bij elk project staat de plaats erbij (' + c.join(' | ') + ')');
  await q.fill('#s2-plaats', 'Berkel Rodenrijs'); await q.press('#s2-plaats', 'Enter');
  ok(await q.inputValue('#s2-project') === 'IB25060', 'lossen: project van de plaats wordt wel ingevuld');
  c = await chipsOf('#s2-tijd');
  ok(c.includes('7.30') && c.every(x => parseFloat(x) > 6), 'uur: laatste tijd op deze plaats en alleen later dan de vorige stop (' + c.join(' ') + ')');
  c = await chipsOf('#s2-items');
  ok(c[0] === '2 bigbag Spramex' && c.filter(x => /bigbag/.test(x)).length === 1, 'items: net geladen staat eerst en gelijke items met ander aantal staan niet dubbel (' + c.join(' | ') + ')');
  ok(q.errs.length === 0, 'slimme voorstellen: geen scriptfouten ' + q.errs.join('|'));
  await q.evaluate(() => document.getElementById('copy').click()); await q.waitForTimeout(400);
  const mem = await q.evaluate(() => JSON.parse(localStorage.getItem('knijperwagen-mem-v2')));
  ok(mem.places['r3s'].nx['berkel rodenrijs'] === 31 && mem.places['berkel rodenrijs'].a.LOSSEN === 26, 'geheugen leert volgorde en laden/lossen mee');
  await q.evaluate(() => document.getElementById('copy').click()); await q.waitForTimeout(400);
  const mem2 = await q.evaluate(() => JSON.parse(localStorage.getItem('knijperwagen-mem-v2')));
  ok(mem2.places['r3s'].nx['berkel rodenrijs'] === 31 && mem2.places['r3s'].n === 41 && mem2.places['berkel rodenrijs'].a.LOSSEN === 26, 'dezelfde route twee keer kopiëren telt maar één keer mee');
  await b.close();
})();
