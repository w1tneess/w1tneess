// GitHub-safe local SVG artwork; deterministic and dependency-free.
// Every image is drawn in a dark and a light palette (assets/dark, assets/light). Wide images also
// get a "-mobile" version with larger type. README.md picks one with <picture><source media>.
// All text is outlined glyph paths (scripts/glyphs.mjs), so it never depends on installed fonts.
// The build throws if any text leaves its image or overlaps other text.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FONTS } from './glyphs.mjs';

const OUT = process.env.ASSET_DIR ?? fileURLToPath(new URL('../assets/', import.meta.url));
const THEMES = {
  dark: { bg: '#0f1611', panel: '#161f18', line: '#2f4132', ink: '#e8efe2', muted: '#a9b9a4', green: '#b0dc83', dim: '#55704b',
    noise: ['#273a28', '#385a32', '#528343', '#82b660', '#badb8d', '#d8e5bc', '#667c52', '#1c2e21'], heat: ['#232e25', '#345330', '#537d40', '#85bc61', '#c1e99b'],
    bezel: '#d9dfce', screen: '#26392a', screenInk: '#b0dc83', stand: '#8ca374', ring: '#e8efe2' },
  light: { bg: '#f4f7ef', panel: '#e9efe0', line: '#bccbb0', ink: '#14211a', muted: '#44584a', green: '#2d6a1e', dim: '#7fa169',
    noise: ['#dce7cf', '#c8dcb1', '#a8c98a', '#86b062', '#6a9a48', '#4d7e33', '#93b873', '#ecf2e3'], heat: ['#e0e9d6', '#c4dba6', '#8fbf68', '#4f8f3a', '#2a6420'],
    bezel: '#c3d1b4', screen: '#16231a', screenInk: '#b8e68c', stand: '#93a887', ring: '#14211a' },
};

// ---- text: outlined glyph runs --------------------------------------------------------------
let boxes = [], defs = new Map(); // glyph outlines are defined once per image and reused
function measure(font, s, size, track = 0) {
  const F = FONTS[font];
  return [...s].reduce((w, ch) => { if (F.adv[ch] === undefined) throw new Error(`No glyph for ${JSON.stringify(ch)} in ${font}`); return w + F.adv[ch] * size / F.upm + track; }, -track);
}
// Largest size <= `size` whose text fits in maxW.
const fit = (font, s, size, maxW) => Math.min(size, size * maxW / measure(font, s, size));
function text(x, y, s, { font = 'mono', size = 14, color, anchor = 'start', track = 0, check = true } = {}) {
  const F = FONTS[font], k = size / F.upm, w = measure(font, s, size, track);
  const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  if (check) boxes.push({ s, l: left, r: left + w, t: y - F.cap * k, b: y + size * 0.22 });
  let pen = 0, out = '';
  for (const ch of s) {
    if (F.g[ch]) { const id = `${font}-${ch.codePointAt(0)}`; defs.set(id, `<path id="${id}" d="${F.g[ch]}"/>`); out += `<use href="#${id}" x="${+pen.toFixed(1)}"/>`; }
    pen += F.adv[ch] + track / k;
  }
  return `<g transform="translate(${+left.toFixed(2)} ${y}) scale(${+k.toFixed(5)})" fill="${color}">${out}</g>`;
}
const bitmap = (rows, x, y, s, color) => rows.flatMap((row, r) => [...row].map((on, c) => on === '1' ? `<rect x="${x + c * s}" y="${y + r * s}" width="${s}" height="${s}" fill="${color}"/>` : '')).join('');
const ARROW = ['0001111', '0000011', '0000101', '0001001', '0010000', '0100000', '1000000'];
const arrow = (T, xRight, y, s) => bitmap(ARROW, xRight - 7 * s, y, s, T.green);

// ---- pixel art ------------------------------------------------------------------------------
const font5x7 = { A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'], V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'], I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'], H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'], N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'] };
const pixels = (label, x, y, scale, color) => [...label].map((ch, i) => bitmap(font5x7[ch] ?? font5x7[' '], x + i * scale * 6, y, scale, color)).join('');
function noise(T, x, y, cols, rows, cell, seed = 3) {
  let state = seed, out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const v = state % 13;
    if (v < 8) out += `<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell}" height="${cell}" fill="${T.noise[v]}"/>`;
  }
  return out;
}
// Pixel terminal and cursor, echoing the builder side of the archive.
const terminal = (T, x, y, k, label, size) => `<rect x="${x}" y="${y}" width="${165 * k}" height="${95 * k}" fill="${T.bezel}"/><rect x="${x + 12 * k}" y="${y + 12 * k}" width="${141 * k}" height="${71 * k}" fill="${T.screen}"/>` + text(x + 24 * k, y + 44 * k, label, { font: 'monoBold', size, color: T.screenInk, check: false }) + `<path d="M${x + 55 * k} ${y + 95 * k}h${54 * k}v${12 * k}h${-54 * k}zM${x + 24 * k} ${y + 107 * k}h${116 * k}v${12 * k}H${x + 24 * k}z" fill="${T.stand}"/>`;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
function art(name, w, h, title, draw) {
  for (const [theme, T] of Object.entries(THEMES)) {
    boxes = []; defs = new Map();
    const body = draw(T);
    for (const [i, a] of boxes.entries()) {
      if (a.l < 4 || a.r > w - 4 || a.t < 2 || a.b > h - 2) throw new Error(`${theme}/${name}: "${a.s}" leaves the image (${a.l.toFixed(0)}..${a.r.toFixed(0)} of ${w})`);
      for (const b of boxes.slice(i + 1)) if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) throw new Error(`${theme}/${name}: "${a.s}" overlaps "${b.s}"`);
    }
    mkdirSync(join(OUT, theme), { recursive: true });
    writeFileSync(join(OUT, theme, name), `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><defs>${[...defs.values()].join("")}</defs><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="4" fill="${T.bg}" stroke="${T.line}"/>${body}</svg>\n`);
  }
}

// ---- hero -----------------------------------------------------------------------------------
const heroTitle = 'Advaita Chandra — student, explorer, builder. Be, not become.';
const tagline = 'STUDENT · EXPLORER · BUILDER';
art('hero.svg', 900, 342, heroTitle, T =>
  text(32, 38, 'W1TNEESS / NOTES FROM A WORK IN PROGRESS', { font: 'pixel', size: 16, color: T.muted }) + pixels('ADVAITA CHANDRA', 32, 64, 7, T.ink) + noise(T, 32, 143, 51, 7, 12, 12) + terminal(T, 699, 137, 1, '> wit_', 24) +
  text(32, 290, tagline, { font: 'pixel', size: 24, color: T.ink }) + text(32, 320, 'West Bengal, India', { size: 14, color: T.muted }) + text(868, 320, 'be, not become.', { size: 15, color: T.green, anchor: 'end' }));
art('hero-mobile.svg', 360, 316, heroTitle, T =>
  text(24, 32, 'W1TNEESS / IN PROGRESS', { font: 'pixel', size: 16, color: T.muted }) + pixels('ADVAITA', 24, 50, 7, T.ink) + pixels('CHANDRA', 24, 112, 7, T.ink) + noise(T, 24, 184, 19, 5, 11, 12) + terminal(T, 250, 180, 0.52, '> wit_', 13) +
  text(24, 278, tagline, { font: 'pixel', size: fit('pixel', tagline, 16, 312), color: T.ink }) + text(24, 300, 'West Bengal, India', { size: 12.5, color: T.muted }) + text(336, 300, 'be, not become.', { size: 12.5, color: T.green, anchor: 'end' }));

// ---- section strips -------------------------------------------------------------------------
for (const [name, label, n] of [['about', 'ABOUT / THE HUMAN', 1], ['stack', 'TOOLS / THE WORKBENCH', 2], ['projects', 'BUILD / SELECTED WORK', 3], ['activity', 'ACTIVITY / COMMIT LOG', 4], ['notes', 'READ / FIELD NOTES', 5], ['contact', 'CONNECT / SAY HELLO', 6]]) {
  art(`section-${name}.svg`, 900, 54, label, T => text(20, 36, label, { font: 'pixel', size: 24, color: T.ink }) + noise(T, 566, 20, 26, 2, 10, n));
  art(`section-${name}-mobile.svg`, 360, 44, label, T => text(14, 29, label, { font: 'pixel', size: 16, color: T.ink }) + noise(T, 268, 12, 8, 2, 10, n));
}

// ---- project cards --------------------------------------------------------------------------
// Desktop cards sit in a 2-column table; below 600px each cell is only ~150px wide, so the
// mobile tile keeps just the title, kind and stack, in larger type.
const projects = [
  { slug: 'osho-documentary', n: '01', title: 'Osho Documentary', kind: 'RESEARCH / INTERACTIVE ARCHIVE', lines: ['Evidence-graded archive on Osho and', 'Rajneeshpuram, with timeline and map.'], tech: 'Next.js · TypeScript', motif: 'archive', m: { title: ['Osho', 'Documentary'], kind: 'Interactive archive', tech: ['Next.js', 'TypeScript'] } },
  { slug: 'declutter', n: '02', title: 'Declutter', kind: 'UTILITY / WINDOWS APP', lines: ['Sorts a messy folder, finds duplicates.', 'Previews first. Never permanently deletes.'], tech: 'Python', motif: 'sort', m: { title: ['Declutter'], kind: 'Windows app', tech: ['Python'] } },
  { slug: 'advaita-website', n: '03', title: 'advaitachandra.in', kind: 'WEBSITE / PUBLIC NOTEBOOK', lines: ['Personal site and public notebook:', 'projects, reading notes, photography.'], tech: 'React · Vite · Tailwind · Supabase', motif: 'grid', m: { title: ['advaitachandra.in'], kind: 'Personal site', tech: ['React · Vite', 'Tailwind · Supabase'] } },
  { slug: 'supportadvaita', n: '04', title: 'Support page', kind: 'WEB / UPI', lines: ['Zero-fee UPI page to support my independent', 'software, research, photography, philosophy.'], tech: 'JavaScript', motif: 'upi', m: { title: ['Support page'], kind: 'UPI page', tech: ['JavaScript'] } },
];
// Motif drawn in a 170x40 box with its origin at (0,0); text inside is positioned by a transform.
const motif = (T, kind) => ({
  archive: `<path d="M0 27h170" stroke="${T.line}"/>` + [0, 1, 2, 3, 4].map(i => `<rect x="${i * 40}" y="${3 + (i % 2) * 12}" width="6" height="${24 - (i % 2) * 12}" fill="${i === 3 ? T.green : T.dim}"/>`).join(''),
  sort: [95, 70, 120].map((w, i) => `<rect x="0" y="${1 + i * 11}" width="${w}" height="6" fill="${i === 1 ? T.green : T.dim}"/>`).join(''),
  grid: noise(T, 0, 0, 13, 3, 9, 5),
  upi: text(0, 28, 'UPI', { font: 'pixel', size: 32, color: T.green, check: false }) + `<path d="M92 18h78" stroke="${T.line}" stroke-dasharray="4 6"/>`,
})[kind];
for (const p of projects) {
  const alt = p.title + '. ' + p.lines.join(' ') + ' ' + p.tech + '.';
  art(`card-${p.slug}.svg`, 440, 240, alt, T =>
    text(22, 31, p.kind, { font: 'pixel', size: 16, color: T.muted }) + text(417, 31, p.n, { font: 'monoBold', size: 14, color: T.green, anchor: 'end' }) + `<path d="M22 45h396" stroke="${T.line}"/>` +
    `<g transform="translate(24 58)">${motif(T, p.motif)}</g>` + text(22, 128, p.title, { font: 'monoBold', size: 26, color: T.ink }) + p.lines.map((line, i) => text(22, 158 + i * 21, line, { size: 14, color: T.muted })).join('') +
    `<path d="M22 198h396" stroke="${T.line}"/>` + text(22, 222, p.tech, { size: 13, color: T.green }) + arrow(T, 417, 207, 2));
  art(`card-${p.slug}-mobile.svg`, 170, 200, alt, T => {
    let y = 94, body = text(12, 24, p.n, { font: 'monoBold', size: 12, color: T.green }) + arrow(T, 158, 12, 2) + `<g transform="translate(12 36) scale(.82)">${motif(T, p.motif)}</g>`;
    for (const line of p.m.title) { body += text(12, y, line, { font: 'monoBold', size: fit('monoBold', line, 15, 146), color: T.ink }); y += 18; }
    body += text(12, y + 2, p.m.kind, { size: 11, color: T.muted }) + `<path d="M12 ${y + 14}h146" stroke="${T.line}"/>`; y += 33;
    for (const line of p.m.tech) { body += text(12, y, line, { size: 11, color: T.green }); y += 16; }
    return body;
  });
}

// ---- technology grid ------------------------------------------------------------------------
const ICONS = [['typescript', 'TypeScript'], ['javascript', 'JavaScript'], ['python', 'Python'], ['html5', 'HTML'], ['css3', 'CSS'], ['react', 'React'], ['nextjs', 'Next.js'], ['vitejs', 'Vite'], ['tailwindcss', 'Tailwind CSS'], ['supabase', 'Supabase'], ['nodejs', 'Node.js'], ['git', 'Git']];
const iconBody = key => readFileSync(new URL(`./icons/${key}.svg`, import.meta.url), 'utf8').replace(/^<svg[^>]*>|<\/svg>\s*$/g, '').replace(/id="([^"]+)"/g, `id="${key}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${key}-$1)`);
const stackAlt = 'Tools and technologies: ' + ICONS.map(i => i[1]).join(', ') + '.';
function stack(name, cols, w, tileW, tileH, gap, pad, label) {
  const rows = Math.ceil(ICONS.length / cols), h = pad * 2 + rows * tileH + (rows - 1) * gap;
  art(name, w, h, stackAlt, T => ICONS.map(([key, text_], i) => {
    const x = pad + (i % cols) * (tileW + gap), y = pad + Math.floor(i / cols) * (tileH + gap), cx = x + tileW / 2;
    // The Next.js mark is a black disc: give it a light rim so it reads on the dark tile. React's pale cyan is darkened a step on the light tile.
    const rim = key === 'nextjs' ? `<circle cx="64" cy="64" r="66" fill="${T.ring}"/>` : '';
    return `<rect x="${x + .5}" y="${y + .5}" width="${tileW - 1}" height="${tileH - 1}" rx="3" fill="${T.panel}" stroke="${T.line}"/><g transform="translate(${cx - 20} ${y + 14}) scale(${40 / 128})">${rim}${T === THEMES.light && key === 'react' ? iconBody(key).replaceAll('#61DAFB', '#1fa8cf') : iconBody(key)}</g>` + text(cx, y + tileH - 15, text_, { size: label, color: T.ink, anchor: 'middle' });
  }).join(''));
}
stack('stack.svg', 6, 880, 132, 96, 12, 14, 14);
stack('stack-mobile.svg', 3, 360, 104, 88, 10, 14, 12.5);

// ---- activity panel -------------------------------------------------------------------------
const snapshot = JSON.parse(readFileSync(new URL('../data/activity.json', import.meta.url), 'utf8'));
const end = new Date(snapshot.asOf + 'T00:00:00Z'), start = new Date(end); start.setUTCDate(end.getUTCDate() - 90);
const until = new Date(+end + 86400000);
const counts = {};
for (const r of snapshot.repositories) for (const c of r.commits) { const d = new Date(c.date); if (d >= start && d < until) counts[c.date.slice(0, 10)] = (counts[c.date.slice(0, 10)] ?? 0) + 1; }
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const heat = (T, x0, y0, stepX, w, stepY, h) => {
  let out = '';
  for (let i = 0; i < 91; i++) {
    const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
    const v = counts[d.toISOString().slice(0, 10)] ?? 0;
    out += `<rect x="${x0 + Math.floor(i / 7) * stepX}" y="${y0 + (i % 7) * stepY}" width="${w}" height="${h}" rx="2" fill="${T.heat[v > 9 ? 4 : v > 4 ? 3 : v > 1 ? 2 : v ? 1 : 0]}"/>`;
  }
  return out;
};
const repoCount = `${snapshot.repositories.length} public repositories`;
const note = `Default-branch history through ${snapshot.asOf} UTC`;
const activityTitle = `Public repository commit activity. ${total} commits in the last 91 days.`;
art('activity.svg', 900, 278, activityTitle, T =>
  text(30, 38, 'PUBLIC WORK / LAST 91 DAYS', { font: 'pixel', size: 16, color: T.ink }) + text(870, 38, `${total} commits`, { font: 'monoBold', size: 16, color: T.green, anchor: 'end' }) + heat(T, 30, 60, 38, 30, 20, 14) +
  text(565, 100, 'SMALL THINGS.', { font: 'pixel', size: 24, color: T.ink }) + text(565, 134, 'STEADY WORK.', { font: 'pixel', size: 24, color: T.green }) + text(565, 166, repoCount, { size: 14, color: T.muted }) + text(565, 190, 'One commit at a time.', { size: 14, color: T.muted }) +
  text(30, 232, note, { size: 12.5, color: T.muted }) + text(30, 254, 'Merges included, bots excluded. Not GitHub contribution totals.', { size: 12, color: T.muted }));
art('activity-mobile.svg', 360, 356, activityTitle, T =>
  text(12, 30, 'PUBLIC WORK / 91 DAYS', { font: 'pixel', size: fit('pixel', 'PUBLIC WORK / 91 DAYS', 16, 224), color: T.ink }) + text(348, 30, `${total} commits`, { font: 'monoBold', size: 13, color: T.green, anchor: 'end' }) + heat(T, 12, 44, 26, 22, 18, 14) +
  text(12, 206, 'SMALL THINGS.', { font: 'pixel', size: 24, color: T.ink }) + text(12, 238, 'STEADY WORK.', { font: 'pixel', size: 24, color: T.green }) + text(12, 264, repoCount, { size: 13, color: T.muted }) + text(12, 284, 'One commit at a time.', { size: 13, color: T.muted }) +
  text(12, 312, note, { size: fit('mono', note, 12, 336), color: T.muted }) + text(12, 330, 'Merges included, bots excluded.', { size: 12, color: T.muted }) + text(12, 346, 'Not GitHub contribution totals.', { size: 12, color: T.muted }));

// ---- footer ---------------------------------------------------------------------------------
art('footer.svg', 900, 80, 'Be, not become.', T => noise(T, 24, 28, 8, 2, 10, 8) + text(450, 47, 'be, not become.', { font: 'monoBold', size: 22, color: T.green, anchor: 'middle' }) + text(874, 46, '/ WIT', { font: 'pixel', size: 16, color: T.muted, anchor: 'end' }));
art('footer-mobile.svg', 360, 64, 'Be, not become.', T => noise(T, 14, 22, 6, 2, 10, 8) + text(190, 39, 'be, not become.', { font: 'monoBold', size: 16, color: T.green, anchor: 'middle' }) + text(346, 38, '/ WIT', { font: 'pixel', size: 16, color: T.muted, anchor: 'end' }));
console.log('Built dark + light pixel banner, strips, cards, technology grid, activity panel and footer (desktop + mobile).');
