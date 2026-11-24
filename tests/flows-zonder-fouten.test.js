// Gebruiksstromen zonder (bruikbaar) internet en zonder toestemmingen: nergens een scriptfout, onbehandelde belofte of foutmelding in de console.
// Elke handeling die het netwerk, GPS of een bibliotheek nodig heeft, mag mislukken, maar nooit stil of met een crash.
const { chromium, launchOptions, ok, ROOT, LEAFLET_JS, LEAFLET_CSS, autoOpen } = require('./helpers.js');
const { devices } = require('playwright');
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const dd = new Date(); const TODAY = iso(dd);
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());   // geen internet voor niets behalve de bestanden zelf
  await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
  await ctx.addInitScript(([T]) => { window.__rej = []; window.addEventListener('unhandledrejection', e => window.__rej.push(String(e.reason && e.reason.message || e.reason)));
    window.open = function () { return null; };
    if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1'); localStorage.setItem('knijperwagen-tipX', '1'); localStorage.setItem('start.tipX', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', lat: 52.09, lon: 5.12, created: 1, modified: 3 }])); localStorage.setItem('locdelen.projects', JSON.stringify([{ nr: 'IB1', name: 'Eerste', lat: 52.09, lon: 5.12 }])); }, [TODAY]);
  const p = autoOpen(await ctx.newPage()); const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|ERR_FAILED|CORS|vault\.json|Access to fetch|Fetch API cannot load/.test(m.text())) errs.push('console: ' + m.text().slice(0, 100)); });
  const step = async (name, fn) => { errs.length = 0; try { await fn(); } catch (e) { errs.push('stap mislukt: ' + e.message.split('\n')[0]); } await p.waitForTimeout(900); const rej = await p.evaluate(() => window.__rej.splice(0)).catch(() => []); const all = [...errs, ...rej]; ok(all.length === 0, name + (all.length ? ' (' + all.slice(0, 2).join(' | ').slice(0, 160) + ')' : '')); };
  const clickIf = async (sel) => { const l = p.locator(sel); if (await l.count() && await l.first().isEnabled()) await l.first().click({ timeout: 3000 }).catch(() => {}); };

  await step('Locatie delen: zoeken zonder internet, coördinaten, Mijn locatie zonder toestemming', async () => {
    await p.goto(ROOT + 'index.html'); await p.waitForTimeout(500);
    await p.fill('#q', 'Domplein 1 Utrecht'); await p.click('#go'); await p.waitForTimeout(1500);
    await p.fill('#q', 'https://maps.app.goo.gl/abcdef'); await p.click('#go'); await p.waitForTimeout(1500);
    await p.fill('#q', '52.0907, 5.1214'); await p.click('#go'); await p.waitForTimeout(800); await p.click('#me'); await p.waitForTimeout(600);
  });
  await step('Locatie delen: alle deelacties zonder bruikbare kaart', async () => {
    await p.fill('#nr', 'IB1'); await p.fill('#name', 'Eerste');
    for (const id of ['copy', 'wa', 'dl', 'img']) { await clickIf('#' + id); await p.waitForTimeout(1500); }
    await p.click('#new'); await p.click('#gear'); await p.waitForTimeout(300); await p.keyboard.press('Escape');
  });
  await step('Route: plakken, kopiëren, WhatsApp, eerdere routes, back-up', async () => {
    await p.goto(ROOT + 'route.html'); await p.waitForTimeout(500);
    await p.click('#paste-toggle'); await p.fill('#paste-text', '1. Laden bij R3S 6.00 -> 1 bigbag spramex\n2. Lossen Bleiswijk IB25011 -> zand'); await p.click('#paste-go'); await p.waitForTimeout(400);
    await clickIf('#copy'); await clickIf('#wa-send'); await p.click('#hist-open'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.click('#gear'); await p.waitForTimeout(200);
    await clickIf('#exp'); await p.waitForTimeout(500); await p.keyboard.press('Escape');
  });
  await step('Projecten: toevoegen, locatie zoeken zonder internet, Huidige locatie, verwijderen', async () => {
    await p.goto(ROOT + 'projecten.html'); await p.waitForTimeout(500);
    await p.fill('#nr', 'IB2'); await p.fill('#name', 'Tweede'); await p.click('#add'); await p.click('.row >> nth=0'); await p.waitForTimeout(300);
    await p.fill('#locQ', 'Domplein'); await p.click('#locGo'); await p.waitForTimeout(1500); await p.click('#locHere'); await p.waitForTimeout(800); await clickIf('#locFromLd');
    await p.click('#edel'); await p.click('#edel'); await p.waitForTimeout(300);
  });
  await step('Logboek: dag invullen, weer zonder internet, foto, rapporten zonder bibliotheek', async () => {
    await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(1200);
    await p.fill('#work', 'Gewerkt'); await p.fill('#f-crew-partner', 'Partner'); await p.fill('#f-crew-count', '2'); await p.click('#add-crew'); await p.waitForTimeout(700);
    const b64 = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 400; c.getContext('2d').fillRect(0, 0, 600, 400); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
    await p.setInputFiles('#shot', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') }); await p.waitForTimeout(2500);
    await clickIf('#report'); await p.waitForTimeout(2000);
    await p.goto(ROOT + 'logboek.html#/p/p1'); await p.waitForTimeout(400); await p.click('#weekBtn'); await p.waitForTimeout(300); await clickIf('#wmake'); await p.waitForTimeout(2000); await p.keyboard.press('Escape');
    await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(500); await p.click('#delDay'); await p.click('#delDay'); await p.waitForTimeout(800);
  });
  await step('Synchroniseren: verbinden zonder internet en met een ongeldige reponaam', async () => {
    await p.goto(ROOT + 'start.html'); await p.waitForTimeout(500);
    await p.fill('#gh-repo', 'arwinvdh/test'); await p.fill('#gh-token', 'github_pat_xxxxxxxxxxxxxxxxxxxx'); await p.click('#gh-go'); await p.waitForTimeout(1500);
    await p.fill('#gh-repo', 'geen reponaam'); await p.click('#gh-go'); await p.waitForTimeout(500);
  });
  await step('Pincode: te korte pincode en ontgrendelen zonder versleuteld bestand', async () => {
    await p.goto(ROOT + 'vault.html'); await p.waitForTimeout(500);
    await p.fill('#repo', 'arwinvdh/test').catch(() => {}); await p.click('#go').catch(() => {}); await p.waitForTimeout(500);
  });
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
