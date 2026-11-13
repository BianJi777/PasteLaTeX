import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mathmlToTex } from './mathml2tex.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(path.join(here, 'fixtures.json'), 'utf8'));

let failed = 0;
for (const f of fixtures) {
  const got = mathmlToTex(f.mathml);
  if (got === f.tex) {
    console.log('ok   ' + f.name);
  } else {
    failed++;
    console.error('FAIL ' + f.name);
    console.error('  expected: ' + f.tex);
    console.error('  got:      ' + got);
  }
}

console.log('');
console.log((fixtures.length - failed) + '/' + fixtures.length + ' passed');
if (failed) process.exit(1);
