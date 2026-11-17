const { chromium, ROOT, LEAFLET_JS, LEAFLET_CSS, launchOptions } = require('./helpers.js');
const { createMock } = require('./mock-github.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const gh = createMock();
  const REPO = 'arwinvdh/locatie-data', TOKEN = 'github_pat_testtoken_0123456789';
  async function device(name) {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('dialog', d => d.accept());
    await ctx.route(u => !/^(file:|https:\/\/api\.github\.com)/.test(u.href), r => r.abort());
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    await ctx.route('https://api.github.com/**', r => gh.handle(r));
    await p.goto(ROOT + 'index.html');
    p.devname = name; return p;
  }
  async function connect(p, repo, token) {
    await p.click('#gear'); await p.fill('#gh-repo', repo || REPO); await p.fill('#gh-token', token || TOKEN); await p.click('#gh-go');
    await p.waitForTimeout(1600);
  }
  const ok = (c, t) => console.log((c ? 'OK   ' : 'FOUT ') + t);

  const A = await device('A'), B = await device('B');
  // veilig: geen verbinding => verborgen status, geen verzoeken
  ok((await A.textContent('#gh-status')).includes('Niet verbonden'), 'zonder verbinding: "Niet verbonden"');
  // fouten bij verbinden
  await A.click('#gear'); await A.fill('#gh-repo', 'arwinvdh/x'); await A.fill('#gh-token', 'verkeerd_token_verkeerd_token'); await A.click('#gh-go'); await A.waitForTimeout(400);
  ok(/ongeldig|verlopen/.test(await A.textContent('#gh-msg')), 'foute token geeft duidelijke melding: ' + (await A.textContent('#gh-msg')).slice(0, 50));
  await A.fill('#gh-repo', 'geen-repo-naam'); await A.fill('#gh-token', TOKEN); await A.click('#gh-go'); await A.waitForTimeout(200);
  ok(/eigenaar\/naam/.test(await A.textContent('#gh-msg')), 'foute reponaam geeft melding');
  gh.repo.private = false; await A.fill('#gh-repo', REPO); await A.click('#gh-go'); await A.waitForTimeout(400);
  ok(/openbaar/.test(await A.textContent('#gh-msg')), 'openbare repo wordt geweigerd');
  gh.repo.private = true;
  await A.keyboard.press('Escape');

  await connect(A);
  ok(await A.evaluate(() => !!JSON.parse(localStorage.getItem('gh-sync-config')).token), 'A verbonden en token bewaard');
  ok(gh.files['data/LEESMIJ.md'] !== undefined, 'startbestand LEESMIJ.md aangemaakt in de repo');

  // A: project aanmaken en bewaren
  await A.fill('#q', '51.995961, 4.476169'); await A.click('#go'); await A.waitForTimeout(500);
  await A.fill('#nr', 'IB25060'); await A.fill('#name', 'HOF Berkel'); await A.fill('#addr', 'Visserstraat 1, 2651 WM Berkel en Rodenrijs');
  await A.click('#copy'); await A.waitForTimeout(3500);
  const dataA = gh.read('data/locatie.json');
  ok(dataA && Object.keys(dataA.docs).some(k => k.startsWith('projects/')), 'A: project staat in de repo: ' + (dataA ? Object.keys(dataA.docs).join(', ') : 'geen bestand'));

  // B: verbinden en project zien
  await connect(B); await B.waitForTimeout(1500);
  ok((await B.locator('.chip').allTextContents()).join('|').includes('HOF Berkel'), 'B: project verschijnt na verbinden');
  // profiel van A naar B
  await A.click('#gear'); await A.fill('#myName', 'Test Persoon'); await A.fill('#myPhone', '0612345678'); await A.click('#settingsOk'); await A.waitForTimeout(3000);
  await B.evaluate(() => window.GhSync.syncNow()); await B.waitForTimeout(600);
  ok((await B.inputValue('#myName')) === 'Test Persoon' && (await B.inputValue('#myPhone')) === '0612345678', 'B: naam en telefoon van A overgenomen');
  // verwijderen van B naar A
  await B.click('.proj .btn.danger'); await B.waitForTimeout(3000);
  await A.evaluate(() => window.GhSync.syncNow()); await A.waitForTimeout(600);
  ok((await A.locator('.chip').count()) === 0, 'A: verwijderd project op B verdwijnt ook op A');
  // concept van A naar B met melding
  await A.fill('#nr', 'IB99999'); await A.fill('#name', 'Voorbeeld Zuid'); await A.waitForTimeout(300);
  await A.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await A.waitForTimeout(2500);
  await B.evaluate(() => window.GhSync.syncNow()); await B.waitForTimeout(800);
  ok(await B.locator('#gh-draft').count() === 1, 'B: melding "nieuwere invoer" verschijnt (niet automatisch overgenomen)');
  ok((await B.inputValue('#nr')) !== 'IB99999', 'B: invoer is nog niet overschreven');
  await B.click('#gh-draft button.primary'); await B.waitForTimeout(500);
  ok((await B.inputValue('#nr')) === 'IB99999' && (await B.inputValue('#name')) === 'Voorbeeld Zuid', 'B: na Overnemen staat de invoer van A er');
  await B.evaluate(() => window.GhSync.syncNow()); await B.waitForTimeout(500);
  ok(await B.locator('#gh-draft').count() === 0, 'geen herhaalde melding (geen ping-pong)');
  // gelijktijdig schrijven: beide apparaten bewaren een ander project tegelijk
  await Promise.all([A, B].map(async (p, i) => {
    await p.fill('#q', i ? '52.0907, 5.1214' : '51.9, 4.4'); await p.click('#go'); await p.waitForTimeout(300);
    await p.fill('#nr', i ? 'B-1' : 'A-1'); await p.fill('#name', i ? 'Van B' : 'Van A'); await p.click('#copy');
  }));
  await A.waitForTimeout(5000);
  await A.evaluate(() => window.GhSync.syncNow()); await B.evaluate(() => window.GhSync.syncNow()); await A.waitForTimeout(2500);
  const keys = Object.keys(gh.read('data/locatie.json').docs).filter(k => k.startsWith('projects/') && !gh.read('data/locatie.json').docs[k].__del);
  ok(keys.length === 2, 'gelijktijdig schrijven: beide projecten blijven bestaan (' + keys.map(decodeURIComponent).join(', ') + ')');
  // storing: 500-fouten en herstel
  gh.fail(2); await A.fill('#nr', 'A-2'); await A.fill('#name', 'Storing'); await A.click('#copy'); await A.waitForTimeout(3500);
  await A.click('#gear'); const st = await A.textContent('#gh-status');
  await A.evaluate(() => window.GhSync.syncNow()).catch(() => {}); await A.waitForTimeout(3000);
  ok(!!gh.read('data/locatie.json').docs['projects/' + encodeURIComponent('a-2|storing')], 'na storing wordt later alsnog bewaard (status ertussen: ' + st.slice(0, 50) + ')');
  // verbreken
  await A.click('#gh-off'); await A.waitForTimeout(1500);
  ok(await A.evaluate(() => localStorage.getItem('gh-sync-config') === null), 'verbreken wist de token');
  ok((await A.locator('.chip').count()) >= 1, 'lokale gegevens blijven na verbreken');
  console.log('requests naar GitHub:', gh.log.length, '| fouten A:', A.errs, '| fouten B:', B.errs);
  await b.close();
})();
