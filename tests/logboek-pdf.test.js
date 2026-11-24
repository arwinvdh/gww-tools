// Dagrapport als PDF: werkzaamheden, materieel, projectgegevens en foto's komen in het bestand.
const { chromium, launchOptions, ok, ROOT, autoOpen } = require('./helpers.js');
const fs = require('fs');
const JSPDF = require.resolve('jspdf/dist/jspdf.umd.min.js');
(async () => {
  const iso0 = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const TODAY = iso0(new Date());
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true, permissions: ['geolocation'], geolocation: { latitude: 52.09, longitude: 5.12, accuracy: 10 } });
  await ctx.route(u => !u.href.startsWith('file:'), r => /jspdf/.test(r.request().url()) ? r.fulfill({ path: JSPDF, contentType: 'application/javascript' }) : r.abort());
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB9', name: 'Rapportproject', who: 'Piet Uitvoerder', phone: '0612345678', note: 'Inrit via de poort', created: 1, modified: 2 }])); } });
  const p = autoOpen(await ctx.newPage()); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(500);
  await p.fill('#work', 'Sleuf gegraven en kabels gelegd'); await p.fill('#f-machines-item', 'Graafmachine'); await p.click('#add-machines'); await p.waitForTimeout(700);
  const b64 = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const g = c.getContext('2d'); g.fillStyle = 'rgb(200,120,40)'; g.fillRect(0, 0, 1200, 900); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
  await p.setInputFiles('#shot', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') });
  await p.waitForSelector('#thumbs button', { timeout: 15000, state: 'attached' });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#report')]);
  const file = await dl.path(); const buf = fs.readFileSync(file); const txt = buf.toString('latin1');
  ok(/^dagrapport-IB9-\d{4}-\d{2}-\d{2}\.pdf$/.test(dl.suggestedFilename()), 'bestandsnaam bevat project en datum (' + dl.suggestedFilename() + ')');
  ok(buf.slice(0, 5).toString() === '%PDF-' && /\/Type\s*\/Page[^s]/.test(txt), 'het resultaat is een PDF met minstens één pagina');
  ok(/\/Subtype\s*\/Image/.test(txt), 'de foto zit in de PDF');
  const info = await p.evaluate(() => document.getElementById('state').textContent);
  ok(/klaar/i.test(info), 'melding "Dagrapport klaar" (' + info + ')');
  ok(await p.evaluate(() => document.scrollingElement.scrollWidth <= document.documentElement.clientWidth) && p.errs.length === 0, 'geen zijwaartse scroll en geen scriptfouten ' + p.errs.join('|'));
  // zonder bibliotheek: duidelijke melding, knop weer bruikbaar
  const c2 = await b.newContext({ viewport: { width: 390, height: 800 } }); await c2.route(u => !u.href.startsWith('file:'), r => r.abort());
  await c2.addInitScript(() => { localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB9', name: 'X', created: 1, modified: 2 }])); });
  const q = autoOpen(await c2.newPage()); await q.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await q.waitForTimeout(400);
  await q.fill('#work', 'Iets'); await q.click('#report'); await q.waitForTimeout(1500);
  ok(/bibliotheek/i.test(await q.textContent('#state')) && await q.locator('#report').isEnabled(), 'zonder verbinding: duidelijke melding en de knop werkt weer');
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
