// Projecten: gedeelde lijst met vast id; kopiëren uit Locatie delen zonder iets daar te wijzigen.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  const SRC = JSON.stringify([{ nr: '123', name: 'Testproject', lat: 52, lon: 5 }, { nr: '', name: 'Alleen naam' }]);
  await ctx.addInitScript((src) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('locdelen.projects', src); } }, SRC);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(ROOT + 'projecten.html'); await p.waitForTimeout(400);
  const read = () => p.evaluate(() => JSON.parse(localStorage.getItem('gww.projects') || 'null'));
  let list = await read();
  ok(list && list.length === 2 && list.every(x => x.v === 1 && x.id && x.created && x.modified), 'eerste keer: projecten uit Locatie delen zijn gekopieerd met vast id');
  ok(await p.evaluate((s) => localStorage.getItem('locdelen.projects') === s, SRC), 'Locatie delen is niet gewijzigd');
  // toevoegen en dubbele weigeren
  await p.fill('#nr', 'IB1'); await p.fill('#name', 'Nieuw'); await p.click('#add'); await p.waitForTimeout(200);
  await p.fill('#nr', 'IB1'); await p.fill('#name', 'nieuw'); await p.click('#add'); await p.waitForTimeout(200);
  list = await read();
  ok(list.length === 3 && /staat er al/.test(await p.textContent('#addmsg')), 'toevoegen werkt en een dubbel project wordt geweigerd');
  // bewerken: id blijft, naam wijzigt
  const idBefore = list.find(x => x.nr === 'IB1').id;
  await p.click(`.row[data-id="${idBefore}"]`); await p.fill('#ename', 'Hernoemd'); await p.click('#esave'); await p.waitForTimeout(200);
  list = await read(); const e = list.find(x => x.id === idBefore);
  ok(e && e.name === 'Hernoemd' && e.modified >= e.created, 'bewerken wijzigt de naam, het id blijft gelijk');
  // opnieuw ophalen maakt geen dubbelen
  await p.click('#import'); await p.waitForTimeout(200);
  ok((await read()).length === 3, 'opnieuw ophalen uit Locatie delen maakt geen dubbelen');
  // verwijderen vraagt bevestiging
  await p.click(`.row[data-id="${idBefore}"]`); await p.click('#edel'); await p.waitForTimeout(100);
  ok((await read()).length === 3, 'verwijderen vraagt eerst bevestiging');
  await p.click('#edel'); await p.waitForTimeout(200);
  ok((await read()).length === 2, 'na bevestiging is het project weg');
  ok(await p.evaluate(() => document.scrollingElement.scrollWidth <= document.documentElement.clientWidth) && p.errs.length === 0, 'geen zijwaartse scroll en geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
