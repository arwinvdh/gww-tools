// PDF-rapporten met bijzondere tekens en veel regels: namen als Łódź en Gdańsk, emoji, euroteken, veel personeel (meerdere pagina's).
// Vereist pdftotext (poppler) om de tekst uit de PDF te lezen; zonder dat programma slaat dit bestand de inhoudscontrole over.
const { chromium, launchOptions, ok, ROOT } = require('./helpers.js');
const fs = require('fs'), os = require('os'), path = require('path'), { execSync } = require('child_process');
const JSPDF = require.resolve('jspdf/dist/jspdf.umd.min.js');
const have = (() => { try { execSync('pdftotext -v', { stdio: 'ignore' }); return true; } catch (e) { return false; } })();
const iso = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); const TODAY = iso(new Date());
const crew = Array.from({ length: 70 }, (_, i) => ({ partner: i === 0 ? 'Zakład Łódź Sp. z o.o. – Gdańsk (ćś)' : i === 1 ? 'Müller & Söhne Bau GmbH, Zürich' : i === 2 ? 'Café “Zon” ’t Hoekje – naïve ñandú' : 'Onderaannemer ' + i + ' B.V.', count: 2 + i % 5, hours: 8 }));
const work = 'Sleuf gegraven. Kabels gelegd bij km 12,4 € 1.250,– inclusief btw. Opmerking: 👷 opzichter akkoord ✔ → verder. Overig: ½ dag stagnatie wegens regen ☔. '.repeat(40);
(async () => {
  const b = await chromium.launch(launchOptions());
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, acceptDownloads: true });
  await ctx.route(u => !u.href.startsWith('file:'), r => /jspdf/.test(r.request().url()) ? r.fulfill({ path: JSPDF, contentType: 'application/javascript' }) : r.abort());
  await ctx.addInitScript(([T, crew, work]) => { if (localStorage.getItem('__s')) return; localStorage.setItem('__s', '1');
    localStorage.setItem('gww.projects', JSON.stringify([{ v: 1, id: 'p1', nr: 'IB9', name: 'Łódź Café Zürich', who: 'Józef Wiśniewski', phone: '0612345678', note: 'Inrit — via de poort “noord”', created: 1, modified: 2 }]));
    localStorage.setItem('gww.log', JSON.stringify([{ v: 1, id: 'l1', projectId: 'p1', date: T, work, other: 'Overig €', equipment: [], crew, machines: [{ item: 'Graafmachine Çat 14 ton', partner: 'Verhuur Łódź', hours: 7 }], stagnation: [{ cause: 'Weer', hours: 2, note: 'Regen ☔' }], extra: { on: true, who: 'Jan', how: 'Mondeling', note: 'Extra stempel ½' }, safety: { toolbox: true, lmra: true, incident: true, note: 'Bijna-ongeval ⚠' }, weather: { temp: 9, desc: 'Regen', wind: 14, rain: 1.2, src: 'auto' }, created: 5, modified: 6 }])); }, [TODAY, crew, work]);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gww-pdf-'));
  const read = (f) => execSync('pdftotext -layout ' + JSON.stringify(f) + ' -', { maxBuffer: 1 << 26 }).toString();
  const pages = (f) => +/Pages:\s+(\d+)/.exec(execSync('pdfinfo ' + JSON.stringify(f)).toString())[1];
  const garbage = /[^\x00-\xff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ\n\f]/;
  const checkText = (t, soort) => {
    ok(/Zaklad Lódz Sp\. z o\.o\. – Gdansk \(cs\)/.test(t) && /Józef Wisniewski/.test(t) && /Lódz Café Zürich/.test(t), `${soort}: Poolse tekens worden de gewone letter (Łódź wordt Lódz), de rest blijft leesbaar`);
    ok(/Müller & Söhne Bau GmbH, Zürich/.test(t) && /Café “Zon” ’t Hoekje – naïve ñandú/.test(t) && /€ 1\.250,–/.test(t) && /½/.test(t), `${soort}: Latijns-1, aanhalingstekens, streepjes, euroteken en ½ blijven staan`);
    ok(/opzichter akkoord/.test(t) && !garbage.test(t) && !/Ø=|þ|ÿþ/.test(t), `${soort}: emoji en symbolen vallen weg zonder rommel in de tekst`);
  };
  await p.goto(ROOT + 'logboek.html#/p/p1/' + TODAY); await p.waitForTimeout(700);
  const [d1] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#report')]);
  const f1 = path.join(tmp, 'dag.pdf'); await d1.saveAs(f1);
  ok(/^dagrapport-IB9-\d{4}-\d{2}-\d{2}\.pdf$/.test(d1.suggestedFilename()) && fs.statSync(f1).size > 3000, 'dagrapport: bestand met projectnummer en datum, ' + fs.statSync(f1).size + ' bytes');
  if (have) {
    const t1 = read(f1), n1 = pages(f1);
    ok(n1 >= 3 && new RegExp('Pagina 1 van ' + n1).test(t1) && new RegExp('Pagina ' + n1 + ' van ' + n1).test(t1), `dagrapport: 70 regels personeel lopen netjes over ${n1} pagina's met paginanummers`);
    ok(/Onderaannemer 69 B\.V\./.test(t1), 'dagrapport: de laatste regel staat er nog in (niets afgekapt)');
    checkText(t1, 'dagrapport');
  } else console.log('OVERGESLAGEN pdftotext ontbreekt: inhoud van de PDF niet gecontroleerd');
  // weekrapport
  await p.goto(ROOT + 'logboek.html#/p/p1'); await p.waitForTimeout(400); await p.click('#weekBtn'); await p.waitForTimeout(300);
  const [d2] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#wmake')]);
  const f2 = path.join(tmp, 'week.pdf'); await d2.saveAs(f2);
  ok(/^weekrapport-IB9-\d{4}-w\d{2}\.pdf$/.test(d2.suggestedFilename()) && fs.statSync(f2).size > 3000, 'weekrapport: bestand met projectnummer en weeknummer (' + d2.suggestedFilename() + ')');
  if (have) {
    const t2 = read(f2); checkText(t2, 'weekrapport');
    ok(pages(f2) >= 2 && /Weekoverzicht/.test(t2), "weekrapport: weekoverzicht en meerdere pagina's");
  }
  ok(p.errs.length === 0, 'geen scriptfouten ' + p.errs.join('|'));
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
})().catch((e) => { console.log('FOUT script: ' + e.message); process.exit(1); });
