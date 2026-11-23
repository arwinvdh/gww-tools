// Logboek, foto's: bewerken met stempel, bewaren op het apparaat, openen en verwijderen.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
(async () => {
  const iso0 = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const TODAY = iso0(new Date());
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, permissions: ['geolocation'], geolocation: { latitude: 52.0907, longitude: 5.1214, accuracy: 12 } });
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 2 }])); } });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(500);
  // testfoto: egaal geel van 2400x1800, zodat de stempel en het verkleinen te zien zijn
  const b64 = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 2400; c.height = 1800; const g = c.getContext('2d'); g.fillStyle = 'rgb(230,230,60)'; g.fillRect(0, 0, 2400, 1800); return c.toDataURL('image/jpeg', 0.9).split(',')[1]; });
  await p.setInputFiles('#shot', { name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') });
  await p.waitForSelector('#thumbs button', { timeout: 15000 });
  const r = await p.evaluate(async () => {
  const iso0 = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const TODAY = iso0(new Date());
    const db = await new Promise((res, rej) => { const q = indexedDB.open('gww-photos', 1); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    const all = await new Promise((res) => { const q = db.transaction('photos').objectStore('photos').getAll(); q.onsuccess = () => res(q.result); });
    const rec = all[0], bmp = await createImageBitmap(rec.blob), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; const g = c.getContext('2d'); g.drawImage(bmp, 0, 0);
    const px = (x, y) => Array.from(g.getImageData(x, y, 1, 1).data);
    return { n: all.length, type: rec.blob.type, w: rec.w, h: rec.h, day: rec.day, lat: rec.lat, top: px(5, 5), bottom: px(5, c.height - 5), log: JSON.parse(localStorage.getItem('gww.log') || '[]') };
  });
  ok(r.n === 1 && r.type === 'image/jpeg' && r.day === 'p1|' + r.log[0].date, 'foto is bewaard op het apparaat, bij project en dag');
  ok(Math.max(r.w, r.h) === 1600, 'grote foto is verkleind naar 1600 px (' + r.w + 'x' + r.h + ')');
  ok(r.top[0] > 200 && r.bottom[0] < 150, 'de stempelbalk onderaan is donker, de rest van de foto niet (boven ' + r.top[0] + ', onder ' + r.bottom[0] + ')');
  ok(Math.abs(r.lat - 52.0907) < 0.001, 'de positie is bij de foto bewaard');
  ok(r.log.length === 1 && r.log[0].projectId === 'p1', 'de dag staat in het logboek, ook zonder tekst');
  // openen en verwijderen
  await p.click('#thumbs button'); await p.waitForTimeout(200);
  ok(await p.locator('#pdlg').evaluate(d => d.open) && await p.locator('#psave').isVisible(), 'tikken op de foto opent hem met een knop om hem in Foto’s te bewaren');
  await p.click('#pdel'); await p.click('#pdel'); await p.waitForTimeout(600);
  ok(await p.locator('#thumbs button').count() === 0, 'verwijderen haalt de foto weg (na bevestiging)');
  await p.waitForTimeout(400);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('gww.log') || '[]'))).length === 0, 'een dag zonder tekst, materieel en foto’s wordt niet bewaard');
  ok(await p.evaluate(() => document.scrollingElement.scrollWidth <= document.documentElement.clientWidth) && p.errs.length === 0, 'geen zijwaartse scroll en geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
