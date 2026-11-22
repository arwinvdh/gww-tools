// Draait alle tests (een paar tegelijk) en toont aan het eind wat er mis is.
// Elk testbestand heeft een eigen browser en poort 0 (vrije poort), dus ze hinderen elkaar niet.
// Zet TEST_PARALLEL=<aantal> om het aantal tegelijk te wijzigen; TEST_PARALLEL=1 draait ze na elkaar (handig bij het opsporen van een vreemde fout).
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
const slots = Math.max(1, +process.env.TEST_PARALLEL || Math.min(4, os.cpus().length));

function run(f) {
  return new Promise((resolve) => {
    const p = spawn('node', [f], { cwd: __dirname });
    let out = '';
    const timer = setTimeout(() => p.kill(), 240000);
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', (status) => { clearTimeout(timer); resolve({ f, out, status }); });
  });
}

(async () => {
  const results = new Array(files.length);
  let next = 0;
  async function worker() {
    while (next < files.length) { const i = next++; results[i] = await run(files[i]); }
  }
  await Promise.all(Array.from({ length: slots }, worker));
  let bad = 0;
  for (const r of results) {
    process.stdout.write(`\n== ${r.f}\n`);
    const fouten = r.out.split('\n').filter(l => l.startsWith('FOUT'));
    const gelukt = r.out.split('\n').filter(l => l.startsWith('OK')).length;
    if (fouten.length || r.status !== 0) { bad++; console.log(fouten.join('\n') || r.out.slice(-600)); }
    console.log(`${gelukt} gelukt, ${fouten.length} fout` + (r.status !== 0 && !fouten.length ? ' (script stopte onverwacht)' : ''));
  }
  console.log(bad ? `\nLET OP: ${bad} testbestand(en) met fouten.` : '\nAlles goed.');
  process.exit(bad ? 1 : 0);
})();
