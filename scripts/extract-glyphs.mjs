// Dev-only (not run by tests or CI): outlines glyphs from OFL fonts into scripts/glyphs.mjs.
// Usage: npm i --no-save opentype.js@1.3.4, then node scripts/extract-glyphs.mjs <dir with the .woff files>
// Fonts used: @fontsource/jetbrains-mono@5.2.5 and @fontsource/silkscreen@5.2.5 (latin + latin-ext, WOFF).
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] ?? '.';
const load = f => { const b = readFileSync(join(dir, f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const sets = { mono: ['jetbrains-mono-latin-400-normal.woff', 'jetbrains-mono-latin-ext-400-normal.woff'], monoBold: ['jetbrains-mono-latin-700-normal.woff', 'jetbrains-mono-latin-ext-700-normal.woff'], pixel: ['silkscreen-latin-400-normal.woff'] };
const chars = [...Array(95)].map((_, i) => String.fromCharCode(32 + i)).concat(['\u00b7', '\u2014', '\u2019', '\u20b9']);
const out = {};
for (const [name, files] of Object.entries(sets)) {
  const fonts = files.map(load), upm = fonts[0].unitsPerEm;
  const os2 = fonts[0].tables.os2;
  const o = { upm, cap: os2.sCapHeight, x: os2.sxHeight, adv: {}, g: {} };
  for (const ch of chars) {
    const font = fonts.find(f => f.charToGlyph(ch).index !== 0);
    if (!font) { if (ch !== ' ') console.warn(name, 'missing', JSON.stringify(ch)); if (ch === ' ') o.adv[ch] = fonts[0].charToGlyph('n').advanceWidth; continue; }
    const g = font.charToGlyph(ch);
    o.adv[ch] = g.advanceWidth;
    const d = g.getPath(0, 0, upm).toPathData(0);
    if (d) o.g[ch] = d;
  }
  out[name] = o;
  console.log(name, 'upm', upm, 'cap', o.cap, 'x', o.x, 'glyphs', Object.keys(o.g).length, 'adv(A)', o.adv.A);
}
const body = `// Outlined glyphs (SIL OFL 1.1): JetBrains Mono (mono) and Silkscreen (pixel). See glyphs.LICENSE.
// Generated once from the fonts' WOFF files so the artwork renders identically without any installed font.
// Each font: upm, cap height, advance widths and SVG path data in font units (y down, baseline at 0).
export const FONTS = ${JSON.stringify(out)};
`;
writeFileSync(new URL('glyphs.mjs', import.meta.url), body);
console.log('bytes', body.length);
