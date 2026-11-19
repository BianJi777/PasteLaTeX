import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mathmlToTex, normalizeDelimiters, wrapBareCommands } from './mathml2tex.mjs';
import { escapePipes } from './pipes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const groups = [
  { file: 'fixtures.json', run: (c) => [mathmlToTex(c.mathml), c.tex] },
  { file: 'fixtures-delimiters.json', run: (c) => [normalizeDelimiters(c.input), c.expected] },
  { file: 'fixtures-bare.json', run: (c) => [wrapBareCommands(c.input), c.expected] },
  { file: 'fixtures-pipes.json', run: (c) => [escapePipes(c.input), c.expected] },
];

let total = 0, failed = 0;
for (const g of groups) {
  for (const f of JSON.parse(readFileSync(path.join(here, g.file), 'utf8'))) {
    total++;
    const [got, expected] = g.run(f);
    if (got === expected) console.log('ok   ' + f.name);
    else {
      failed++;
      console.error('FAIL ' + f.name);
      console.error('  expected: ' + JSON.stringify(expected));
      console.error('  got:      ' + JSON.stringify(got));
    }
  }
}
console.log('');
console.log((total - failed) + '/' + total + ' passed');
if (failed) process.exit(1);
