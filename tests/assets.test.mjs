import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const assets = readdirSync(join(root, 'assets'), { recursive: true }).filter(f => !f.endsWith('LICENSE') && /\.\w+$/.test(f)).map(f => f.replaceAll('\\', '/'));

test('README references only assets that exist, and every asset is used', () => {
  const used = new Set([...readme.matchAll(/(?:src|srcset)="(assets\/[^"]+)"/g)].map(m => m[1].slice('assets/'.length)));
  for (const f of used) assert.ok(assets.includes(f), `README references missing assets/${f}`);
  for (const f of assets) assert.ok(used.has(f), `assets/${f} is not referenced by README.md (obsolete?)`);
});

test('in-page README links point at an existing anchor', () => {
  for (const [, id] of readme.matchAll(/\]\(#([\w-]+)\)/g)) assert.ok(readme.includes(`<a id="${id}">`), `no anchor for #${id}`);
});

test('SVGs carry no scripts, external references or embedded images', () => {
  for (const f of assets.filter(f => f.endsWith('.svg'))) {
    const s = readFileSync(join(root, 'assets', f), 'utf8');
    assert.doesNotMatch(s, /<script|foreignObject|<image|href=|@import|data:|url\((?!#)/i, `assets/${f} has a risky construct`);
  }
});

test('committed pixel art matches the generator and committed activity data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'profile-assets-'));
  execFileSync(process.execPath, [join(root, 'scripts/build-assets.mjs')], { env: { ...process.env, ASSET_DIR: dir }, stdio: 'ignore' });
  for (const f of readdirSync(dir)) assert.equal(readFileSync(join(root, 'assets', f), 'utf8'), readFileSync(join(dir, f), 'utf8'), `assets/${f} is stale: run node scripts/build-assets.mjs`);
});

// Monospace glyphs are ~0.6em wide in every fallback font; 0.62 leaves a little slack.
test('generated text stays inside its image and never overlaps a neighbour', () => {
  for (const f of readdirSync(join(root, 'assets')).filter(f => /^(hero|section|card|activity|footer).*\.svg$/.test(f))) {
    const s = readFileSync(join(root, 'assets', f), 'utf8').replace(/<g transform[\s\S]*?<\/g>/g, ''); // card motifs are positioned by transform
    const width = +s.match(/viewBox="0 0 (\d+) /)[1];
    const rows = new Map();
    for (const [, x, y, size, anchor = 'start', raw] of s.matchAll(/<text x="([\d.]+)" y="([\d.]+)"[^>]*font-size="([\d.]+)"[^>]*?(?:text-anchor="(\w+)")?>([^<]*)<\/text>/g)) {
      const w = [...raw.replace(/&(amp|lt|gt|quot|apos);/g, '_')].length * size * 0.62;
      const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : +x;
      assert.ok(left >= 4 && left + w <= width - 4, `${f}: "${raw}" overflows (${left.toFixed(0)}..${(left + w).toFixed(0)} of ${width})`);
      for (const [l, r, t] of rows.get(y) ?? []) assert.ok(left + w <= l || left >= r, `${f}: "${raw}" overlaps "${t}"`);
      rows.set(y, [...(rows.get(y) ?? []), [left, left + w, raw]]);
    }
  }
});
