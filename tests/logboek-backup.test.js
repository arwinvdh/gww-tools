// Logboek: back-up maken en terugzetten (zonder foto's). Terugzetten voegt toe en overschrijft alleen met een nieuwere versie; het verwijdert nooit iets.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
const fs = require('fs'), os = require('os'), path = require('path');
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const dd = new Date(); const D1 = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 1, 12)), D2 = iso(new Date(dd.getFullYear(), dd.getMonth(), dd.getDate() - 2, 12)), TODAY = iso(dd);
const P = (id, nr, mod) => ({ v: 1, id, nr, name: 'Project ' + nr, created: 1, modified: mod });
const L = (id, pid, date, work, mod) => ({ v: 1, id, projectId: pid, date, work, equipment: [], crew: [{ partner: 'B', count: 2, hours: 8 }], created: 1, modified: mod });
(async () => {
  const b = await chromium.launch(launchOptions());
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gww-bk-'));
  const mk = async (data) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true }); await ctx.route(u => !u.href.startsWith('file:'), r => r.abort());
    await ctx.addInitScript(([d]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1'); Object.keys(d).forEach(k => localStorage.setItem(k, typeof d[k] === 'string' ? d[k] : JSON.stringify(d[k]))); }, [data]);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  };
  const ls = (p, k) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);

  // 1. herinnering en back-up maken
  const A = await mk({ 'gww.projects': [P('p1', 'IB1', 100), P('p2', 'IB2', 200)], 'gww.log': [L('l1', 'p1', D1, 'Dag een', 1000), L('l2', 'p1', D2, 'Dag twee', 2000)] });
  await A.goto(ROOT + 'logboek.html'); await A.waitForTimeout(500);
  ok(await A.locator('#backupCard').isVisible() && await A.locator('#backupHint').isVisible(), 'zonder back-up en met dagen: de herinnering staat er');
  const [dl] = await Promise.all([A.waitForEvent('download'), A.click('#bkExp')]);
  const file = path.join(tmp, 'bk.json'); await dl.saveAs(file); const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  ok(/^gww-logboek-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()) && data.app === 'gww-tools' && data.v === 1 && data.projects.length === 2 && data.log.length === 2 && data.log[0].work === 'Dag een', 'back-up maken: bestand met alle projecten en dagen (' + dl.suggestedFilename() + ')');
  ok(/Foto.s zitten er niet in/.test(await A.textContent('#bkMsg')) && await A.locator('#backupHint').isHidden() && +await A.evaluate(() => localStorage.getItem('gww.lastBackup')) > Date.now() - 5000, 'back-up maken: melding noemt dat foto\'s ontbreken, herinnering weg, datum bewaard');
  await A.reload(); await A.waitForTimeout(400);
  ok(await A.locator('#backupHint').isHidden(), 'na een recente back-up blijft de herinnering weg');
  const B0 = await mk({ 'gww.projects': [P('p1', 'IB1', 100)], 'gww.log': [L('l1', 'p1', D1, 'Dag een', 1000)], 'gww.lastBackup': String(Date.now()) });
  await B0.goto(ROOT + 'logboek.html'); await B0.waitForTimeout(400);
  ok(await B0.locator('#backupHint').isHidden(), 'geen herinnering als er recent een back-up is gemaakt');
  await B0.context().close();

  // 2. terugzetten in een toestel met andere gegevens: toevoegen, alleen nieuwere overschrijven, niets verwijderen
  const C = await mk({ 'gww.projects': [P('p1', 'IB1 lokaal nieuwer', 500), P('p3', 'IB3', 50)], 'gww.log': [L('l1', 'p1', D1, 'Lokaal nieuwer', 9000), L('l2', 'p1', D2, 'Lokaal ouder', 100), L('l9', 'p3', TODAY, 'Alleen lokaal', 1)] });
  await C.goto(ROOT + 'logboek.html'); await C.waitForTimeout(500);
  await C.setInputFiles('#bkFile', file); await C.waitForTimeout(800);
  const lg = await ls(C, 'gww.log'), pr = await ls(C, 'gww.projects');
  const day = (d) => lg.find(x => x.projectId === 'p1' && x.date === d);
  ok(day(D1).work === 'Lokaal nieuwer' && day(D2).work === 'Dag twee' && lg.some(x => x.work === 'Alleen lokaal') && lg.length === 3, 'terugzetten: nieuwere lokale dag blijft, oudere lokale dag wordt bijgewerkt, lokale dag zonder back-up blijft (' + lg.map(x => x.work).join(' | ') + ')');
  ok(pr.length === 3 && pr.find(x => x.id === 'p1').nr === 'IB1 lokaal nieuwer' && pr.some(x => x.id === 'p2') && pr.some(x => x.id === 'p3'), 'terugzetten: ontbrekend project toegevoegd, nieuwer lokaal project en project zonder back-up blijven');
  ok(/Teruggezet: 1 project en 1 dag toegevoegd/.test(await C.textContent('#bkMsg')) && /ongewijzigd/.test(await C.textContent('#bkMsg')), 'terugzetten: melding met aantallen (' + await C.textContent('#bkMsg') + ')');
  await C.setInputFiles('#bkFile', file); await C.waitForTimeout(500);
  ok(JSON.stringify(await ls(C, 'gww.log')) === JSON.stringify(lg), 'twee keer terugzetten geeft hetzelfde resultaat (geen dubbelen)');
  ok(C.errs.length === 0, 'geen scriptfouten ' + C.errs.join('|'));

  // 3. ongeldige of vreemde bestanden
  const bads = { 'kapot.json': '{ geen json', 'leeg.json': '', 'ander.json': JSON.stringify({ app: 'iets-anders', projects: [], log: [] }), 'geenlijst.json': JSON.stringify({ app: 'gww-tools', v: 1, projects: {}, log: 'x' }) };
  const before = JSON.stringify(await ls(C, 'gww.log')) + JSON.stringify(await ls(C, 'gww.projects')); let allBad = true;
  for (const [n, c] of Object.entries(bads)) { const f = path.join(tmp, n); fs.writeFileSync(f, c); await C.setInputFiles('#bkFile', f); await C.waitForTimeout(400); if (!/geen geldige back-up/.test(await C.textContent('#bkMsg'))) allBad = false; }
  ok(allBad && before === JSON.stringify(await ls(C, 'gww.log')) + JSON.stringify(await ls(C, 'gww.projects')) && C.errs.length === 0, 'ongeldige bestanden (kapot, leeg, ander programma, geen lijsten): duidelijke melding en niets gewijzigd');
  const rommel = path.join(tmp, 'rommel.json'); fs.writeFileSync(rommel, JSON.stringify({ app: 'gww-tools', v: 1, projects: [null, 5, 'x', { nr: 'zonder id' }, P('p9', 'IB9', 5)], log: [null, { projectId: 'p9', date: 'nietdatum' }, { date: D1 }, L('l99', 'p9', D1, 'Geldig', 5)] }));
  await C.setInputFiles('#bkFile', rommel); await C.waitForTimeout(500);
  const lg2 = await ls(C, 'gww.log'), pr2 = await ls(C, 'gww.projects');
  ok(pr2.some(x => x.id === 'p9') && lg2.some(x => x.id === 'l99') && !pr2.some(x => x.nr === 'zonder id') && lg2.length === lg.length + 1 && pr2.length === pr.length + 1, 'rommel in de back-up wordt overgeslagen, de geldige regels worden teruggezet');
  // terugzetten in een leeg toestel
  const E = await mk({ 'gww.projects': [P('pz', 'IBZ', 1)] });
  await E.goto(ROOT + 'logboek.html'); await E.waitForTimeout(400); await E.setInputFiles('#bkFile', file); await E.waitForTimeout(700);
  ok((await ls(E, 'gww.log')).length === 2 && (await ls(E, 'gww.projects')).length === 3 && E.errs.length === 0, 'terugzetten in een toestel met één project: de back-up komt erbij');
  fs.rmSync(tmp, { recursive: true, force: true });
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
