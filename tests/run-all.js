// Draait alle tests na elkaar en toont aan het eind wat er mis is.
const { spawnSync } = require('child_process');
const fs = require('fs');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
let bad = 0;
for (const f of files) {
  process.stdout.write(`\n== ${f}\n`);
  const r = spawnSync('node', [f], { cwd: __dirname, encoding: 'utf8', timeout: 240000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const fouten = out.split('\n').filter(l => l.startsWith('FOUT'));
  const gelukt = out.split('\n').filter(l => l.startsWith('OK')).length;
  if (fouten.length || r.status !== 0) { bad++; console.log(fouten.join('\n') || out.slice(-600)); }
  console.log(`${gelukt} gelukt, ${fouten.length} fout` + (r.status !== 0 && !fouten.length ? ' (script stopte onverwacht)' : ''));
}
console.log(bad ? `\nLET OP: ${bad} testbestand(en) met fouten.` : '\nAlles goed.');
process.exit(bad ? 1 : 0);
