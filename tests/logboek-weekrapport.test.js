// Weekrapport als PDF vanuit de dagen van een project: dialoog, weekkeuze, bestand met en zonder foto's.
const { chromium, launchOptions, ok, ROOT, autoOpen } = require('./helpers.js');
const fs = require('fs');
const JSPDF = require.resolve('jspdf/dist/jspdf.umd.min.js');
(async () => {
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const now = new Date(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const D = (n) => { const d = new Date(mon); d.setDate(mon.getDate() + n); return iso(d); };
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, permissions: ['geolocation'], geolocation: { latitude: 52.09, longitude: 5.12, accuracy: 10 } });
  await ctx.route(u => !u.href.startsWith('file:'), r => /jspdf/.test(r.request().url()) ? r.fulfill({ path: JSPDF, contentType: 'application/javascript' }) : r.abort());
  await ctx.addInitScript(([d0, d1]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB9', name: 'Weekproject', who: 'Piet', phone: '0612345678', created: 1, modified: 2 }]));
    localStorage.setItem('gww.log', JSON.stringify([
      { v: 1, id: 'a', projectId: 'p1', date: d0, work: 'Sleuf gegraven', crew: [{ partner: 'Bouwpartner BV', count: 3, hours: 8 }], stagnation: [{ cause: 'Weer', hours: 2, note: '' }], created: 1, modified: 5 },
      { v: 1, id: 'b', projectId: 'p1', date: d1, work: 'Kabels gelegd', crew: [{ partner: 'Bouwpartner BV', count: 4, hours: 8 }], created: 1, modified: 4 }
    ]));
  }, [D(0), D(1)]);
  const p = autoOpen(await ctx.newPage()); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const gen = async (withPhotos) => {
    await p.goto(ROOT + 'logboek.html#/p/p1'); await p.waitForTimeout(500);
    if (await p.locator('#wdlg').evaluate(d => d.open)) await p.click('#wclose');
    await p.click('#weekBtn'); await p.waitForTimeout(200);
    if (withPhotos) await p.check('#wphotos'); else await p.uncheck('#wphotos');
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#wmake')]);
    return { name: dl.suggestedFilename(), buf: fs.readFileSync(await dl.path()) };
  };

  await p.goto(ROOT + 'logboek.html#/p/p1'); await p.waitForTimeout(500);
  ok(await p.locator('#weekBtn').isVisible(), 'laag 2: knop Weekrapport PDF');
  await p.click('#weekBtn'); await p.waitForTimeout(200);
  ok(await p.locator('#wdlg').evaluate(d => d.open) && /^Week \d+ · /.test(await p.textContent('#wtitle')) && /2 dagen met invoer/.test(await p.textContent('#wcount')), 'dialoog: huidige week met het aantal dagen met invoer (' + await p.textContent('#wtitle') + ')');
  const w0 = await p.textContent('#wtitle');
  await p.click('#wprev'); await p.waitForTimeout(100);
  ok(await p.textContent('#wtitle') !== w0 && /Geen dagen met invoer/.test(await p.textContent('#wcount')) && await p.isDisabled('#wmake'), 'vorige week: andere week, geen invoer, PDF maken staat uit');
  await p.click('#wnext'); await p.waitForTimeout(100);
  ok(await p.textContent('#wtitle') === w0 && await p.isEnabled('#wmake'), 'volgende week: terug naar de huidige week');
  await p.click('#wclose');

  const a = await gen(false);
  ok(/^weekrapport-IB9-\d{4}-w\d{2}\.pdf$/.test(a.name) && a.buf.slice(0, 5).toString() === '%PDF-', 'weekrapport als PDF met project en weeknummer in de naam (' + a.name + ')');
  ok(/\/Type\s*\/Page[^s]/.test(a.buf.toString('latin1')), 'het bestand heeft minstens één pagina');

  // een foto toevoegen aan maandag en kijken of de PDF groter wordt met de schakelaar aan
  await p.goto(ROOT + 'logboek.html#/p/p1/' + D(0)); await p.waitForTimeout(500);
  const b64 = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 1200; c.height = 900; const g = c.getContext('2d'); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgb(' + (i * 7 % 255) + ',' + (i * 13 % 255) + ',' + (i * 29 % 255) + ')'; g.fillRect((i * 37) % 1200, (i * 53) % 900, 90, 70); } return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
  await p.setInputFiles('#shot', { name: 'f.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') });
  await p.waitForSelector('#thumbs button', { timeout: 15000, state: 'attached' });
  const noPhotos = await gen(false), withPhotos = await gen(true);
  ok(/\/Subtype\s*\/Image/.test(withPhotos.buf.toString('latin1')) && !/\/Subtype\s*\/Image/.test(noPhotos.buf.toString('latin1')), 'foto’s komen alleen in de PDF als je de schakelaar aanzet');
  ok(withPhotos.buf.length > noPhotos.buf.length + 5000, 'met foto’s is de PDF groter (' + noPhotos.buf.length + ' tegen ' + withPhotos.buf.length + ' bytes)');
  ok(await p.evaluate(() => document.scrollingElement.scrollWidth <= document.documentElement.clientWidth) && p.errs.length === 0, 'geen zijwaartse scroll en geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
