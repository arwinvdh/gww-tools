const { chromium, ROOT, LEAFLET_JS, LEAFLET_CSS, launchOptions } = require('./helpers.js');
const { createMock } = require('./mock-github.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const gh = createMock(); const REPO = 'arwinvdh/locatie-data', TOKEN = 'github_pat_testtoken_0123456789';
  const ok = (c, t) => console.log((c ? 'OK   ' : 'FOUT ') + t);
  async function ctxNew() {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route(u => !/^(file:|https:\/\/api\.github\.com)/.test(u.href), r => r.abort());
    await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
    await ctx.route('https://api.github.com/**', r => gh.handle(r));
    return ctx;
  }
  const ctxA = await ctxNew(); const A = await ctxA.newPage(); const errs = []; A.on('pageerror', e => errs.push(e.message));
  await A.goto(ROOT + 'index.html');
  await A.click('#gear'); await A.fill('#gh-repo', REPO); await A.fill('#gh-token', TOKEN); await A.click('#gh-go'); await A.waitForTimeout(1600);
  await A.click('#gear'); await A.waitForTimeout(200);
  ok(await A.locator('#gh-linkbtn').isVisible(), 'koppellinkknop zichtbaar als verbonden');
  await A.click('#gh-linkbtn'); await A.waitForTimeout(300);
  const link = await A.evaluate(() => navigator.clipboard.readText());
  ok(link.includes('#koppel=') && !link.includes(TOKEN), 'link gekopieerd, token staat niet leesbaar in de link');
  // tweede apparaat
  const ctxB = await ctxNew(); const B = await ctxB.newPage(); B.on('pageerror', e => errs.push(e.message));
  await B.goto(link); await B.waitForTimeout(800);
  ok(!(await B.evaluate(() => location.hash)), 'adresbalk is meteen opgeschoond (geen token in de URL)');
  ok(await B.locator('#gh-link').count() === 1 && (await B.textContent('#gh-link')).includes(REPO), 'bevestiging toont de reponaam');
  ok(await B.evaluate(() => localStorage.getItem('gh-sync-config') === null), 'nog niet gekoppeld voor bevestiging');
  await B.click('#gh-link button.primary'); await B.waitForTimeout(1800);
  ok(await B.evaluate(() => !!JSON.parse(localStorage.getItem('gh-sync-config') || 'null')), 'na Koppelen is B verbonden');
  await B.click('#gear'); ok((await B.textContent('#gh-status')).includes('Verbonden met ' + REPO), 'status op B: ' + (await B.textContent('#gh-status')).slice(0, 60));
  // kwaadaardige of kapotte links
  const ctxC = await ctxNew(); const C = await ctxC.newPage(); C.on('pageerror', e => errs.push(e.message));
  await C.goto(ROOT + 'index.html#koppel=%%%niet-geldig'); await C.waitForTimeout(500);
  ok(await C.locator('#gh-link').count() === 0, 'kapotte link wordt genegeerd');
  const evil = Buffer.from(JSON.stringify({ r: 'aanvaller/repo', t: 'github_pat_evil_evil_evil_evil_evil' })).toString('base64url');
  const ctxD = await ctxNew(); const D = await ctxD.newPage(); D.on('pageerror', e => errs.push(e.message));
  await D.goto(ROOT + 'index.html#koppel=' + evil); await D.waitForTimeout(800);
  ok((await D.textContent('#gh-link')).includes('aanvaller/repo'), 'link naar een andere repo toont die naam ter controle');
  await D.click('#gh-link button:not(.primary)'); await D.waitForTimeout(300);
  ok(await D.evaluate(() => localStorage.getItem('gh-sync-config') === null), 'Annuleren koppelt niets');
  console.log('fouten:', errs);
  await b.close();
})();
