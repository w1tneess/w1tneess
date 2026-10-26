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
    assert.doesNotMatch(s, /<script|foreignObject|<image|href="(?!#)|@import|data:|url\((?!#)/i, `assets/${f} has a risky construct`);
  }
});

test('every dark image has a light twin, and committed art matches the generator and activity data', () => {
  const dir = mkdtempSync(join(tmpdir(), 'profile-assets-'));
  execFileSync(process.execPath, [join(root, 'scripts/build-assets.mjs')], { env: { ...process.env, ASSET_DIR: dir }, stdio: 'ignore' });
  // The build itself throws when text overflows an image or overlaps other text.
  const generated = readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.svg')).map(f => f.replaceAll('\\', '/')).sort();
  assert.deepEqual(generated, assets.filter(f => /^(dark|light)\//.test(f)).sort(), 'generated and committed asset lists differ');
  for (const f of generated.filter(f => f.startsWith('dark/'))) assert.ok(generated.includes(f.replace('dark/', 'light/')), `${f} has no light twin`);
  for (const f of generated) assert.equal(readFileSync(join(root, 'assets', f), 'utf8'), readFileSync(join(dir, f), 'utf8'), `assets/${f} is stale: run node scripts/build-assets.mjs`);
});
