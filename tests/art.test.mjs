import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, PAIRS } from '../scripts/art-themes.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const assets = readdirSync(join(root, 'assets'));

const lum = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('every text colour meets WCAG AA on the backgrounds it sits on, in both themes', () => {
  for (const [theme, T] of Object.entries(THEMES)) for (const [fg, bg] of PAIRS) assert.ok(ratio(T[fg], T[bg]) >= 4.5, `${theme}: ${fg} on ${bg} is ${ratio(T[fg], T[bg]).toFixed(2)}:1`);
});

test('README references only local assets that exist, and every asset is used', () => {
  const used = new Set([...readme.matchAll(/(?:src|srcset)="assets\/([^"]+)"/g)].map(m => m[1]));
  for (const f of used) assert.ok(assets.includes(f), `README references missing assets/${f}`);
  for (const f of assets) assert.ok(used.has(f), `assets/${f} is not referenced by README.md (obsolete?)`);
});

test('in-page README links point at an existing heading', () => {
  const headings = new Set([...readme.matchAll(/^## (.+)$/gm)].map(m => m[1].toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')));
  for (const [, id] of readme.matchAll(/\]\(#([\w-]+)\)/g)) assert.ok(headings.has(id), `no heading for #${id}`);
});

test('SVGs carry no scripts, external references or embedded images', () => {
  for (const f of assets) assert.doesNotMatch(readFileSync(join(root, 'assets', f), 'utf8'), /<script|foreignObject|<image|href=|@import|data:|url\((?!#)/i, `assets/${f} has a risky construct`);
});

test('committed artwork matches the generator (the build also throws on overflowing text)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'profile-art-'));
  execFileSync(process.execPath, [join(root, 'scripts/build-art.mjs')], { env: { ...process.env, ASSET_DIR: dir }, stdio: 'ignore' });
  assert.deepEqual(readdirSync(dir).sort(), [...assets].sort());
  // Windows checkouts may convert line endings, so compare without them.
  for (const f of readdirSync(dir)) assert.equal(readFileSync(join(root, 'assets', f), 'utf8').replaceAll('\r\n', '\n'), readFileSync(join(dir, f), 'utf8'), `assets/${f} is stale: run node scripts/build-art.mjs`);
});
