// Serif text as SVG. GitHub strips font-family from Markdown/HTML, so Georgia is only reachable inside an <img>.
// Each text becomes a light/dark pair, embedded with <picture> so it follows the GitHub theme.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const SERIF = "Georgia,'Times New Roman',serif";
const INK = { light: '#0B0B0B', dark: '#F5F5F2' };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function wrap(text, n) {
  const lines = [''];
  for (const w of text.split(/\s+/)) {
    const next = (lines.at(-1) + ' ' + w).trim();
    if (next.length > n && lines.at(-1)) lines.push(w);
    else lines[lines.length - 1] = next;
  }
  return lines;
}

// shortcut: width is estimated at 0.54em per Georgia glyph, so a canvas may sit slightly wide; measure if it ever clips.
export function typesetSvg(text, { size = 24, wrapAt = 999, style = 'normal', spacing = 0, prefix = '', meta = '', tone = 'light' } = {}) {
  const lines = wrap(text, wrapAt);
  const lead = Math.round(size * 1.28);
  const indent = prefix ? Math.ceil(prefix.length * size * 0.5) + 16 : 0; // hanging numeral
  const w = indent + Math.ceil(Math.max(...lines.map((l) => l.length)) * (size * 0.54 + spacing)) + 8;
  const h = lines.length * lead + Math.round(size * 0.3) + (meta ? 26 : 0);
  const base = Math.round(size * 0.95);
  // Secondary line (a date) sits in the same image, so it aligns exactly with the title's left edge.
  const sub = meta
    ? `<text x="${indent}" y="${lines.length * lead + Math.round(size * 0.3) + 12}" font-family="-apple-system,'Segoe UI',Helvetica,Arial,sans-serif" font-size="13" letter-spacing=".4" fill="${tone === 'light' ? '#6B6B6B' : '#A3A3A3'}">${esc(meta)}</text>`
    : '';
  const num = prefix
    ? `<text x="0" y="${base}" font-family="${SERIF}" font-size="${Math.round(size * 0.75)}" font-style="italic" fill="${INK[tone]}" fill-opacity=".6">${esc(prefix)}</text>`
    : '';
  const body = num + lines
    .map((l, i) => `<text x="${indent}" y="${base + i * lead}" font-family="${SERIF}" font-size="${size}" font-style="${style}" letter-spacing="${spacing}" fill="${INK[tone]}">${esc(l)}</text>`)
    .join('') + sub;
  return { w, h, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(text)}"><title>${esc(text)}${meta ? ', ' + esc(meta) : ''}</title>${body}</svg>\n` };
}

// Writes assets/<dir>/<name>-<hash>-{light,dark}.svg and returns a <picture> element. Hash in the name defeats image caching.
export function picture(text, opts, { dir, name, alt = text, stable = false }) {
  mkdirSync(dir, { recursive: true });
  const hash = stable ? '' : '-' + createHash('sha1').update(text + JSON.stringify(opts)).digest('hex').slice(0, 8);
  const [light, dark] = ['light', 'dark'].map((tone) => {
    const out = typesetSvg(text, { ...opts, tone });
    const file = `${dir}/${name}${hash}-${tone}.svg`;
    writeFileSync(file, out.svg);
    return { file, ...out };
  });
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="${dark.file}"><img src="${light.file}" alt="${esc(alt)}" height="${light.h}"></picture>`;
}
