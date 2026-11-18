// Koppelen via de startpagina: één keer token plakken, tweede apparaat via de koppellink, daarna gekoppeld in alle tools.
const { chromium, ROOT, launchOptions, ok } = require('./helpers.js');
const { createMock } = require('./mock-github.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const gh = createMock(); const REPO = 'arwinvdh/locatie-data', TOKEN = 'github_pat_testtoken_0123456789';
  async function dev() {
    const ctx = await b.newContext({ viewport: { width: 1100, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route(u => !/^(file:|https:\/\/api\.github\.com)/.test(u.href), r => r.abort());
    await ctx.route('https://api.github.com/**', r => gh.handle(r));
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); return p;
  }
  const A = await dev();
  await A.goto(ROOT + 'start.html'); await A.waitForTimeout(500);
  ok(await A.locator('#gh-repo').isVisible() && !(await A.locator('#couple').isVisible()), 'startpagina toont het koppelformulier, nog zonder stappen voor een tweede apparaat');
  await A.fill('#gh-repo', REPO); await A.fill('#gh-token', TOKEN); await A.click('#gh-go'); await A.waitForTimeout(1700);
  ok(await A.evaluate(() => !!JSON.parse(localStorage.getItem('gh-sync-config') || 'null')), 'A: verbonden via de startpagina');
  ok(await A.locator('#couple').isVisible() && await A.locator('#gh-linkbtn').isVisible(), 'A: stappen voor een tweede apparaat en de koppellinkknop zichtbaar');
  await A.click('#gh-now'); await A.waitForTimeout(800);
  ok((await A.textContent('#gh-msg')).includes('Klaar'), 'A: Nu synchroniseren werkt als verbindingstest (' + (await A.textContent('#gh-msg')) + ')');
  await A.click('#gh-linkbtn'); await A.waitForTimeout(300);
  const link = await A.evaluate(() => navigator.clipboard.readText());
  ok(/start\.html#koppel=/.test(link) && !link.includes(TOKEN), 'koppellink wijst naar de startpagina en bevat de token niet leesbaar');
  const B = await dev();
  await B.goto(link); await B.waitForTimeout(800);
  ok(await B.locator('#gh-link').count() === 1 && (await B.textContent('#gh-link')).includes(REPO), 'B: bevestigingsmelding met de reponaam');
  await B.click('#gh-link button.primary'); await B.waitForTimeout(1800);
  ok(await B.evaluate(() => !!JSON.parse(localStorage.getItem('gh-sync-config') || 'null')), 'B: gekoppeld na Koppelen');
  // de verbinding geldt ook voor de tools zelf
  await B.goto(ROOT + 'route.html'); await B.waitForTimeout(800); await B.click('#gear'); await B.waitForTimeout(300);
  ok((await B.textContent('#gh-status')).includes('Verbonden met ' + REPO), 'B: Route knijperwagen is meteen verbonden (' + (await B.textContent('#gh-status')).slice(0, 50) + ')');
  ok(A.errs.length + B.errs.length === 0, 'geen scriptfouten ' + A.errs.concat(B.errs).join('|'));
  await b.close();
})();
