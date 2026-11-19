// Locatie delen: adres bij een pin zonder huisnummer. Met nagebootste PDOK-antwoorden op echte metingen.
const { chromium, ROOT, LEAFLET_JS, LEAFLET_CSS, launchOptions, ok } = require('./helpers.js');
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } });
  let sc = null;   // { adres: {..., afstand}, wegen: [...] }
  await ctx.route(u => !u.href.startsWith('file:'), r => {
    const u = new URL(r.request().url());
    if (u.hostname === 'api.pdok.nl' && /\/reverse$/.test(u.pathname)) {
      const ty = u.searchParams.get('type'); const docs = ty === 'adres' ? (sc && sc.adres ? [sc.adres] : []) : ty === 'weg' ? ((sc && sc.wegen) || []) : [];
      return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ response: { docs } }) });
    }
    return r.abort();
  });
  await ctx.route('**/leaflet.min.*', r => r.fulfill({ path: r.request().url().endsWith('.js') ? LEAFLET_JS : LEAFLET_CSS }));
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(ROOT + 'index.html'); await p.waitForTimeout(600);
  await p.evaluate(() => { document.getElementById('tip').hidden = true; });
  const run = async (scenario) => {
    sc = scenario; await p.click('#new'); await p.fill('#q', '51.9990, 4.4700'); await p.click('#go'); await p.waitForTimeout(900);
    return { addr: await p.inputValue('#addr'), note: (await p.textContent('#addrNote')).trim(), noteShown: await p.locator('#addrNote').isVisible(), near: await p.locator('#near1').isVisible() };
  };
  const adres = (straat, nr, pc, plaats, afstand) => ({ type: 'adres', straatnaam: straat, huisnummer: nr, postcode: pc, woonplaatsnaam: plaats, weergavenaam: straat + ' ' + nr, afstand });
  const weg = (straat, plaats, afstand) => ({ type: 'weg', straatnaam: straat, woonplaatsnaam: plaats, weergavenaam: straat + ', ' + plaats, afstand });

  let r = await run({ adres: adres('Spaarnestraat', 11, '2652DG', 'Berkel en Rodenrijs', 5.5), wegen: [] });
  ok(r.addr === 'Spaarnestraat 11, 2652 DG Berkel en Rodenrijs' && !r.near && !r.noteShown, 'tot 20 m: gewoon het adres, geen aanduiding (' + r.addr + ')');

  r = await run({ adres: adres('Merenweg', 22, '2665KM', 'Bleiswijk', 81), wegen: [] });
  ok(r.addr === 'Nabij Merenweg 22, 2665 KM Bleiswijk' && r.near && r.noteShown, '81 m: "Nabij" voor het adres, met uitleg (' + r.addr + ')');
  ok(/81 m/.test(r.note) && /Nabij/.test(r.note), 'de uitleg noemt de afstand (' + r.note + ')');

  r = await run({ adres: adres('Coloradoweg', 6, '3199LA', 'Maasvlakte Rotterdam', 164), wegen: [weg('Fietspad', 'Maasvlakte Rotterdam', 78), weg('Europaweg', 'Maasvlakte Rotterdam', 149), weg('Coloradoweg', 'Maasvlakte Rotterdam', 174)] });
  ok(r.addr === 'Nabij Europaweg, Maasvlakte Rotterdam', '164 m van het adres: de dichtstbijzijnde echte weg, niet het fietspad (' + r.addr + ')');
  ok(/149 m/.test(r.note), 'de uitleg noemt de afstand tot de weg (' + r.note + ')');

  r = await run({ adres: adres('Vijverlaan', 1, '6731CK', 'Otterlo', 1164), wegen: [weg('Boveneindseweg', 'Otterlo', 409), weg('Karweg', 'Otterlo', 487)] });
  ok(r.addr === 'Nabij Boveneindseweg, Otterlo', '1164 m van het adres, weg op 409 m: de weg (' + r.addr + ')');

  r = await run({ adres: adres('Vijverlaan', 1, '6731CK', 'Otterlo', 1164), wegen: [weg('Fietspad', 'Otterlo', 90), weg('CER', 'Otterlo', 242), weg('Houtkampweg', 'Otterlo', 700)] });
  ok(r.addr === 'Nabij Otterlo' && /Alleen|alleen/.test(r.note), 'geen bruikbare weg binnen 500 m: alleen de plaats (' + r.addr + ')');

  // woord kiezen met één tik, en onthouden bij een nieuwe pin
  r = await run({ adres: adres('Merenweg', 22, '2665KM', 'Bleiswijk', 81), wegen: [] });
  await p.click('#near1 button:has-text("Tegenover")'); await p.waitForTimeout(200);
  ok(await p.inputValue('#addr') === 'Tegenover Merenweg 22, 2665 KM Bleiswijk', 'tik op Tegenover vervangt het woord (' + await p.inputValue('#addr') + ')');
  const t = await p.evaluate(() => document.getElementById('preview').textContent);
  ok(/Tegenover Merenweg 22\n2665 KM Bleiswijk/.test(t), 'het gekozen woord staat in het bericht (' + JSON.stringify(t.slice(0, 80)) + ')');
  ok(await p.evaluate(() => [...document.querySelectorAll('#near1 .chip')].find(b => b.getAttribute('aria-pressed') === 'true').textContent) === 'Tegenover', 'het gekozen woord is gemarkeerd');
  sc = { adres: adres('Merenweg', 24, '2665KM', 'Bleiswijk', 70), wegen: [] };
  await p.evaluate(() => document.getElementById('addr').value = ''); await p.fill('#q', '51.9992, 4.4702'); await p.click('#go'); await p.waitForTimeout(900);
  ok((await p.inputValue('#addr')).startsWith('Tegenover Merenweg 24'), 'een nieuwe pin tijdens dezelfde keuze houdt het gekozen woord (' + await p.inputValue('#addr') + ')');

  // zelf typen blijft kunnen: het woord weg
  await p.fill('#addr', 'Merenweg 22, Bleiswijk'); await p.waitForTimeout(200);
  ok(await p.locator('#near1').isHidden(), 'zonder aanduiding in het adres zijn de woorden verborgen');
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close();
})();
