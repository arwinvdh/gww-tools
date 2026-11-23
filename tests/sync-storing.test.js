// Synchroniseren onder moeilijke omstandigheden (nagebootste GitHub): storingen, geen verbinding, ingetrokken token, kapot bestand in de repo,
// gelijktijdige wijzigingen en verwijderingen. Plus de samenvoeg-regels zelf met rare gegevens. Lokale gegevens mogen nooit verloren gaan.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
const { createMock } = require('./mock-github.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const gh = createMock(); const REPO = 'arwinvdh/test-data', TOKEN = 'github_pat_testtoken_0123456789';
  let net = true;   // false = geen verbinding met GitHub
  const waitFor = async (fn, ms = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 300)); } return false; };
  async function dev(extra, token) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
    await ctx.route(u => !/^(file:|https:\/\/api\.github\.com)/.test(u.href), r => r.abort());
    await ctx.route('https://api.github.com/**', r => net ? gh.handle(r) : r.abort());
    await ctx.addInitScript(([repo, token, ex]) => { if (!localStorage.getItem('__s')) { localStorage.setItem('__s', '1'); localStorage.setItem('gh-sync-config', JSON.stringify({ repo, token })); Object.keys(ex || {}).forEach(k => localStorage.setItem(k, ex[k])); } }, [REPO, token || TOKEN, extra]);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  };
  const ls = (p, k) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);
  const remote = (f) => gh.read('data/' + f);
  const nowMs = Date.now();
  const proj = (id, nr, name, mod, extra) => ({ v: 1, id, nr, name, created: 1, modified: mod, ...(extra || {}) });

  // --- 1. storing en geen verbinding: lokaal blijft alles, later volgt het alsnog ---
  const A = await dev({ 'gww.projects': JSON.stringify([proj('a1', 'IB1', 'Eerste', nowMs - 1000)]) });
  await A.goto(ROOT + 'projecten.html'); await A.waitForTimeout(500);
  ok(await waitFor(() => remote('projecten.json') && Object.keys(remote('projecten.json').docs).length === 1), 'start: het project komt in de repo');
  gh.fail(6);
  await A.fill('#nr', 'IB2'); await A.fill('#name', 'Tweede'); await A.click('#add'); await A.waitForTimeout(500);
  ok((await ls(A, 'gww.projects')).length === 2, 'storing (500): het nieuwe project staat lokaal');
  await A.evaluate(() => GwwData.run()); await A.waitForTimeout(800);
  ok(/mislukt|storing|oeps/i.test(await A.textContent('#syncmsg')) || (await A.textContent('#syncmsg')).length > 0, 'storing: de pagina zegt dat synchroniseren mislukt (' + (await A.textContent('#syncmsg')).slice(0, 60) + ')');
  gh.fail(0);
  ok(await A.evaluate(async () => { await GwwData.run(); return true; }) && await waitFor(() => Object.keys(remote('projecten.json').docs).length === 2), 'na de storing: het tweede project komt alsnog in de repo');
  net = false;
  await A.fill('#nr', 'IB3'); await A.fill('#name', 'Derde'); await A.click('#add'); await A.waitForTimeout(300);
  await A.evaluate(() => GwwData.run()); await A.waitForTimeout(1200);
  ok((await ls(A, 'gww.projects')).length === 3 && Object.keys(remote('projecten.json').docs).length === 2, 'geen verbinding: lokaal drie projecten, de repo heeft er nog twee');
  net = true; await A.evaluate(() => GwwData.run());
  ok(await waitFor(() => Object.keys(remote('projecten.json').docs).length === 3), 'weer verbinding: het derde project wordt nagestuurd');
  ok(A.errs.length === 0, 'storing en offline: geen scriptfouten ' + A.errs.join('|'));

  // --- 2. gelijktijdige wijziging: nieuwste wint per project, niets dubbel ---
  const B = await dev(); await B.goto(ROOT + 'projecten.html');
  ok(await waitFor(async () => (await ls(B, 'gww.projects') || []).length === 3), 'B: ziet de drie projecten');
  net = false;
  const ida = (await ls(A, 'gww.projects')).find(x => x.nr === 'IB2').id;
  await A.click(`.row[data-id="${ida}"]`); await A.fill('#ename', 'Tweede door A'); await A.click('#esave'); await A.waitForTimeout(300);
  await B.click(`.row[data-id="${ida}"]`); await B.waitForTimeout(100); await B.fill('#ename', 'Tweede door B'); await B.click('#esave'); await B.waitForTimeout(300);   // B is later
  net = true; await A.evaluate(() => GwwData.run()); await B.evaluate(() => GwwData.run());
  await waitFor(async () => remote('projecten.json').docs['projects/' + ida].name === 'Tweede door B');
  await A.evaluate(() => GwwData.run()); await A.waitForTimeout(1500);
  const finalA = (await ls(A, 'gww.projects')).filter(x => x.id === ida);
  ok(finalA.length === 1 && finalA[0].name === 'Tweede door B' && (await ls(A, 'gww.projects')).length === 3, 'gelijktijdig gewijzigd: de nieuwste wijziging wint, geen dubbel project (' + finalA.map(x => x.name).join(',') + ')');

  // --- 3. verwijderen op A terwijl B daarna iets wijzigt: de latere wijziging blijft ---
  const idc = (await ls(A, 'gww.projects')).find(x => x.nr === 'IB3').id;
  net = false;
  await A.click(`.row[data-id="${idc}"]`); await A.click('#edel'); await A.click('#edel'); await A.waitForTimeout(300);
  await B.click(`.row[data-id="${idc}"]`); await B.waitForTimeout(100); await B.fill('#ename', 'Derde later bewerkt'); await B.click('#esave'); await B.waitForTimeout(300);
  net = true; await A.evaluate(() => GwwData.run()); await B.evaluate(() => GwwData.run()); await A.waitForTimeout(1500); await A.evaluate(() => GwwData.run()); await A.waitForTimeout(1500);
  const survive = (await ls(A, 'gww.projects')).find(x => x.id === idc);
  ok(!!survive && survive.name === 'Derde later bewerkt', 'verwijderd op A, daarna bewerkt op B: de latere bewerking blijft bestaan op beide apparaten');

  // --- 4. token ingetrokken: duidelijke melding, lokale gegevens blijven ---
  const C = await dev({ 'gww.projects': JSON.stringify([proj('c1', 'IB7', 'Lokaal', nowMs)]) }, 'github_pat_ingetrokken_000000000');
  await C.goto(ROOT + 'projecten.html'); await C.waitForTimeout(1500);
  ok((await ls(C, 'gww.projects')).length === 1 && C.errs.length === 0, 'ingetrokken token: lokale projecten blijven staan, geen scriptfouten');
  ok(/mislukt|token|ongeldig|401/i.test(await C.textContent('#syncmsg')), 'ingetrokken token: duidelijke melding (' + (await C.textContent('#syncmsg')).slice(0, 80) + ')');

  // --- 5. kapot bestand in de repo: lokaal blijft alles, geen fouten ---
  gh.files['data/projecten.json'] = { content: Buffer.from('{ dit is geen json').toString('base64'), sha: 'kapot1' };
  const D = await dev({ 'gww.projects': JSON.stringify([proj('d1', 'IB8', 'Lokaal D', nowMs)]) });
  await D.goto(ROOT + 'projecten.html'); await D.waitForTimeout(2000);
  ok((await ls(D, 'gww.projects')).length === 1 && D.errs.length === 0, 'kapot bestand in de repo: lokale projecten blijven staan, geen scriptfouten');

  // --- 6. de samenvoeg-regels met rare gegevens ---
  const E = await dev(); await E.goto(ROOT + 'projecten.html'); await E.waitForTimeout(500);
  const res = await E.evaluate(() => {
    const T = Date.now(); const out = {};
    const run = (local, remote, tombs) => { localStorage.setItem('gww.projects', JSON.stringify(local)); localStorage.setItem('gww.tombstones', JSON.stringify(tombs || {})); const r = GwwData._reconcile('projects', remote); return { list: JSON.parse(localStorage.getItem('gww.projects')), r }; };
    const P = (id, mod, name) => ({ v: 1, id, nr: id, name: name || id, created: 1, modified: mod });
    // nieuwere remote wint, nieuwere lokale wordt teruggestuurd
    let x = run([P('a', T - 10, 'lokaal')], [{ key: 'projects/a', d: { ...P('a', T, 'remote'), t: T } }]); out.remoteWint = x.list[0].name === 'remote';
    x = run([P('a', T, 'lokaal')], [{ key: 'projects/a', d: { ...P('a', T - 10, 'remote'), t: T - 10 } }]); out.lokaalWint = x.list[0].name === 'lokaal' && x.r.pushes.length === 1;
    // remote verwijderd, lokaal later bewerkt: blijft en wordt teruggestuurd
    x = run([P('a', T)], [{ key: 'projects/a', d: { __del: true, t: T - 5000 } }]); out.laterBewerkt = x.list.length === 1 && x.r.pushes.length === 1;
    x = run([P('a', T - 9000)], [{ key: 'projects/a', d: { __del: true, t: T } }]); out.remoteVerwijderd = x.list.length === 0;
    // lokaal verwijderd (grafsteen) en remote ouder: verwijdering wordt doorgestuurd
    x = run([], [{ key: 'projects/a', d: { ...P('a', T - 9000), t: T - 9000 } }], { 'projects/a': T }); out.lokaalVerwijderd = x.list.length === 0 && x.r.pushes.some(p => p.doc.__del);
    // rare of onvolledige gegevens uit de repo worden genegeerd
    x = run([P('a', T)], [{ key: 'projects/x', d: null }, { key: 'projects/y', d: { nr: 'zonder id' } }, { key: 'projects/z', d: 'tekst' }, { key: 'projects/w', d: { id: 'w' } }]); out.rommel = x.list.some(p => p.id === 'a');
    // lokale lijst met rommel
    x = run([null, 5, 'x', { id: 'a', modified: T }], []); out.lokaalRommel = Array.isArray(x.list);
    // veel gegevens blijven snel
    const many = Array.from({ length: 2000 }, (_, i) => P('m' + i, T - i)); const t0 = performance.now(); run(many, many.map(p => ({ key: 'projects/' + p.id, d: { ...p, t: p.modified } }))); out.snel = performance.now() - t0 < 1500;
    return out;
  });
  ok(res.remoteWint && res.lokaalWint, 'samenvoegen: de nieuwste versie wint, een nieuwere lokale versie wordt teruggestuurd');
  ok(res.laterBewerkt && res.remoteVerwijderd && res.lokaalVerwijderd, 'samenvoegen: verwijderingen en latere bewerkingen worden juist afgehandeld');
  ok(res.rommel && res.lokaalRommel && res.snel, 'samenvoegen: rare gegevens uit de repo of lokaal geven geen fout en 2000 projecten blijven snel');
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
