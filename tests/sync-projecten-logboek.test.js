// Synchroniseren van Projecten en Logboek tussen twee apparaten, met een nagebootste GitHub.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
const { createMock } = require('./mock-github.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const gh = createMock(); const REPO = 'arwinvdh/test-data', TOKEN = 'github_pat_testtoken_0123456789';
  const waitFor = async (fn, ms = 25000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 300)); } return false; };
  async function dev(extra) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
    await ctx.route(u => !/^(file:|https:\/\/api\.github\.com)/.test(u.href), r => r.abort());
    await ctx.route('https://api.github.com/**', r => gh.handle(r));
    await ctx.addInitScript(([repo, token, ex]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1');
      localStorage.setItem('gh-sync-config', JSON.stringify({ repo, token })); Object.keys(ex || {}).forEach(k => localStorage.setItem(k, ex[k])); } }, [REPO, TOKEN, extra]);
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  }
  const ls = (p, k) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);
  const remote = (f) => gh.read('data/' + f);

  // A maakt een project; B krijgt het
  const A = await dev(); await A.goto(ROOT + 'projecten.html'); await A.waitForTimeout(500);
  await A.fill('#nr', 'IB1'); await A.fill('#name', 'Eerste'); await A.click('#add');
  ok(await waitFor(() => remote('projecten.json') && Object.keys(remote('projecten.json').docs).length === 1), 'A: nieuw project staat in data/projecten.json');
  const B = await dev(); await B.goto(ROOT + 'projecten.html');
  ok(await waitFor(async () => (await ls(B, 'gww.projects') || []).length === 1), 'B: ziet het project van A');
  const idA = (await ls(A, 'gww.projects'))[0].id;
  ok((await ls(B, 'gww.projects'))[0].id === idA, 'B: hetzelfde id als bij A');

  // B hernoemt, A ziet het na openen
  await B.waitForTimeout(500); await B.click('.row'); await B.fill('#ename', 'Hernoemd'); await B.click('#esave');
  ok(await waitFor(() => { const r = remote('projecten.json'); return r && r.docs['projects/' + idA] && r.docs['projects/' + idA].name === 'Hernoemd'; }), 'B: wijziging staat in de repo');
  await A.reload(); ok(await waitFor(async () => ((await ls(A, 'gww.projects')) || [])[0].name === 'Hernoemd'), 'A: ziet de nieuwe naam, id blijft gelijk');

  // logboek: A schrijft een dag, B ziet hem
  await A.goto(ROOT + 'logboek.html#gp=' + idA); await A.waitForTimeout(600);
  await A.fill('#work', 'Sleuf gegraven'); await A.fill('#eqin', 'Graafmachine'); await A.click('#eqadd');
  ok(await waitFor(() => remote('logboek.json') && Object.keys(remote('logboek.json').docs).length === 1), 'A: logregel staat in data/logboek.json');
  await B.goto(ROOT + 'logboek.html#gp=' + idA);
  ok(await waitFor(async () => ((await ls(B, 'gww.log')) || []).length === 1), 'B: ziet de logregel van A');
  ok(await waitFor(async () => (await B.inputValue('#work')) === 'Sleuf gegraven'), 'B: de dag staat open met de tekst van A');
  ok(JSON.stringify(Object.keys(remote('logboek.json').docs)[0].split('/').length) === '3', 'logregel staat onder log/<project-id>/<datum>');

  // verwijderingen worden gedeeld: A leegt de dag
  await A.fill('#work', ''); await A.click('#eqlist .chip');
  ok(await waitFor(() => { const d = Object.values(remote('logboek.json').docs)[0]; return d && d.__del; }), 'A: een lege dag wordt als verwijderd in de repo gezet');
  await B.reload();
  ok(await waitFor(async () => ((await ls(B, 'gww.log')) || []).length === 0), 'B: de verwijderde dag verdwijnt ook');

  // een project verwijderen wordt ook gedeeld
  await A.goto(ROOT + 'projecten.html'); await A.waitForTimeout(500); await A.click('.row'); await A.click('#edel'); await A.click('#edel');
  ok(await waitFor(() => { const d = remote('projecten.json').docs['projects/' + idA]; return d && d.__del; }), 'A: verwijderd project staat als verwijderd in de repo');
  await B.goto(ROOT + 'projecten.html');
  ok(await waitFor(async () => ((await ls(B, 'gww.projects')) || []).length === 0), 'B: het verwijderde project verdwijnt ook, het komt niet terug');
  ok((await ls(B, 'gww.tombstones') || {})['projects/' + idA] > 0, 'B: onthoudt de verwijdering');

  // nieuw apparaat met dezelfde projecten in Locatie delen: geen dubbelen na synchroniseren
  const A2 = await dev(); await A2.goto(ROOT + 'projecten.html'); await A2.waitForTimeout(500);
  await A2.fill('#nr', 'IB5'); await A2.fill('#name', 'Vijfde'); await A2.click('#add');
  ok(await waitFor(() => Object.keys(remote('projecten.json').docs).filter(k => !remote('projecten.json').docs[k].__del).length === 1), 'A: tweede project is gesynchroniseerd');
  const C = await dev({ 'locdelen.projects': JSON.stringify([{ nr: 'IB5', name: 'Vijfde' }]) });
  await C.goto(ROOT + 'projecten.html');
  await waitFor(async () => ((await ls(C, 'gww.projects')) || []).length >= 1); await C.waitForTimeout(1500);
  ok(((await ls(C, 'gww.projects')) || []).length === 1, 'nieuw apparaat: een project dat al bestaat wordt niet nog eens overgenomen uit Locatie delen');
  ok([A, B, A2, C].every(p => p.errs.length === 0), 'geen scriptfouten ' + [A, B, A2, C].map(p => p.errs.join('|')).join(''));
  await b.close();
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
