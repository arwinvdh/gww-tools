// Logboek: per project en dag werkzaamheden en materieel, met vast id en verwijzing naar het project-id.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
(async () => {
  const iso0 = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const TODAY = iso0(new Date());
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1');
    localStorage.setItem('gww.projects', JSON.stringify([
      { v: 1, id: 'p1', nr: 'IB1', name: 'Eerste', created: 1, modified: 2 }, { v: 1, id: 'p2', nr: 'IB2', name: 'Tweede', created: 1, modified: 1 }])); } });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(ROOT + 'logboek.html#/p/p2/' + TODAY); await p.waitForTimeout(500);
  const hash = async (h) => { await p.evaluate((x) => { location.hash = x; }, h); await p.waitForTimeout(500); };
  const log = () => p.evaluate(() => JSON.parse(localStorage.getItem('gww.log') || '[]'));
  ok(await p.textContent('#dayProj') === 'IB2 · Tweede', 'de dag opent bij het juiste project');
  await p.fill('#work', 'Sleuf gegraven'); await p.fill('#f-machines-item', 'Graafmachine'); await p.click('#add-machines'); await p.waitForTimeout(800);
  let l = await log();
  ok(l.length === 1 && l[0].projectId === 'p2' && l[0].work === '• Sleuf gegraven' && l[0].equipment.join() === 'Graafmachine' && l[0].v === 1 && l[0].id, 'werkzaamheden en materieel worden vanzelf bewaard met project-id en vast id');
  const id0 = l[0].id;
  await p.fill('#work', 'Sleuf gegraven en gestort'); await p.waitForTimeout(800);
  l = await log();
  ok(l.length === 1 && l[0].id === id0 && l[0].work === 'Sleuf gegraven en gestort', 'wijzigen werkt dezelfde regel bij (id blijft gelijk)');
  // ander project: eigen, lege dag; materieel wordt voorgesteld uit eerdere dagen
  await hash('#/p/p1/' + TODAY);
  ok(await p.inputValue('#work') === '' && await p.locator('#sug-machines .chip', { hasText: 'Graafmachine' }).count() === 1, 'ander project start leeg en stelt eerder materieel voor');
  await p.click('#sug-machines .chip'); await p.waitForTimeout(300);
  l = await log();
  ok(l.length === 2 && l.some(x => x.projectId === 'p1' && x.equipment.join() === 'Graafmachine'), 'voorgesteld materieel toevoegen bewaart een regel voor dat project');
  // materieel weghalen en alles leegmaken verwijdert de regel
  await p.click('#list-machines .del'); await p.waitForTimeout(300);
  ok((await log()).length === 1, 'een lege dag wordt niet bewaard');
  // eerdere dagen: terugkeren naar project 2 en de dag openen
  await hash('#/p/p2'); const rows = await p.locator('#dlist .day').count();
  await hash('#/p/p2/' + TODAY);
  ok(rows === 1 && await p.inputValue('#work') === 'Sleuf gegraven en gestort', 'terug naar het project toont de bewaarde dag en de geschiedenis');
  // andere datum: de oude dag blijft zoals hij was, de nieuwe dag is leeg
  const before = (await log()).find(x => x.projectId === 'p2');
  await hash('#/p/p2/2026-01-05');
  l = await log();
  ok(await p.inputValue('#work') === '' && l.length === 1 && l[0].id === before.id && l[0].date === before.date && l[0].work === before.work, 'andere datum: oude dag blijft ongewijzigd, nieuwe dag start leeg');
  ok(await p.evaluate(() => document.scrollingElement.scrollWidth <= document.documentElement.clientWidth) && p.errs.length === 0, 'geen zijwaartse scroll en geen scriptfouten ' + p.errs.join('|'));
  // zonder projecten
  const c2 = await b.newContext({ viewport: { width: 390, height: 800 } }); await c2.route(u => !u.href.startsWith('file:'), r => r.abort());
  const q = await c2.newPage(); await q.goto(ROOT + 'logboek.html'); await q.waitForTimeout(300);
  ok(await q.locator('#noProj').isVisible() && await q.locator('#v1').isHidden(), 'zonder projecten verwijst het logboek naar Projecten');
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
