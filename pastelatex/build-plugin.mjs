import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const converter = fs.readFileSync(path.join(here, '..', 'm2t', 'mathml2tex.mjs'), 'utf8')
  .replace('export function mathmlToTex', 'function mathmlToTex');
const pipes = fs.readFileSync(path.join(here, '..', 'm2t', 'pipes.mjs'), 'utf8')
  .replace(/^export /gm, '');
const mdTable = fs.readFileSync(path.join(here, '..', 'm2t', 'md-table.mjs'), 'utf8')
  .replace(/^export /gm, '');
const glue = fs.readFileSync(path.join(here, 'glue-plugin.js'), 'utf8');
const out = glue.replace('__MATHML2TEX__', () => converter).replace('__PIPES__', () => pipes).replace('__MDTABLE__', () => mdTable);
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
fs.writeFileSync(path.join(here, 'dist', 'main.js'), out);
console.log('built dist/main.js: ' + out.length + ' bytes');
