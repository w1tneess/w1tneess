// GitHub-safe local SVG artwork; deterministic and dependency-free.
// Wide images also get a *-mobile.svg that README.md swaps in below 600px
// (<picture><source media>), so text stays readable on a phone.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = process.env.ASSET_DIR ?? fileURLToPath(new URL('../assets/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const C = { bg: '#111713', panel: '#19211b', line: '#344437', ink: '#e5ebdf', muted: '#a7b6a1', green: '#b0dc83' };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const text = (x, y, s, size = 16, color = C.ink, extra = '') => `<text x="${x}" y="${y}" font-family="'DejaVu Sans Mono',Menlo,Consolas,monospace" font-size="${size}" fill="${color}" ${extra}>${esc(s)}</text>`;
const svg = (name, w, h, title, body) => writeFileSync(join(OUT, name), `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect width="${w}" height="${h}" rx="4" fill="${C.bg}"/>${body}</svg>\n`);
// Pixel lettering remains consistent without remote fonts.
const font = { A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'], V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'], I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'], H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'], N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'], ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'] };
const pixels = (label, x, y, scale = 6) => [...label].map((ch, i) => (font[ch] ?? font[' ']).map((row, r) => [...row].map((on, c) => on === '1' ? `<rect x="${x + i * scale * 6 + c * scale}" y="${y + r * scale}" width="${scale}" height="${scale}" fill="${C.ink}"/>` : '').join('')).join('')).join('');
function noise(x, y, cols, rows, cell, seed = 3) {
  let state = seed, out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const v = state % 13;
    if (v < 8) out += `<rect x="${x + c * cell}" y="${y + r * cell}" width="${cell}" height="${cell}" fill="${['#273a28', '#385a32', '#528343', '#82b660', '#badb8d', '#d8e5bc', '#667c52', '#1c2e21'][v]}"/>`;
  }
  return out;
}
// Pixel terminal and cursor, echoing the builder side of the archive.
const terminal = (x, y, k, label, size) => `<rect x="${x}" y="${y}" width="${165 * k}" height="${95 * k}" fill="#d9dfce"/><rect x="${x + 12 * k}" y="${y + 12 * k}" width="${141 * k}" height="${71 * k}" fill="#273b2b"/>` + text(x + 24 * k, y + 44 * k, label, size, C.green) + `<path d="M${x + 55 * k} ${y + 95 * k}h${54 * k}v${12 * k}h${-54 * k}zM${x + 24 * k} ${y + 107 * k}h${116 * k}v${12 * k}H${x + 24 * k}z" fill="#8ca374"/>`;

// Hero banner
const heroTitle = 'Advaita Chandra — student, explorer, builder. Be, not become.';
svg('hero.svg', 900, 342, heroTitle,
  text(32, 35, 'W1TNEESS / NOTES FROM A WORK IN PROGRESS', 13, C.muted) + pixels('ADVAITA CHANDRA', 32, 61, 7) + noise(32, 143, 51, 7, 12, 12) + terminal(699, 137, 1, '> wit_', 25) +
  text(32, 284, 'STUDENT · EXPLORER · BUILDER', 17) + text(32, 315, 'West Bengal, India', 13, C.muted) + text(868, 315, 'be, not become.', 14, C.green, 'text-anchor="end"'));
svg('hero-mobile.svg', 360, 316, heroTitle,
  text(24, 30, 'W1TNEESS / WORK IN PROGRESS', 11, C.muted) + pixels('ADVAITA', 24, 50, 7) + pixels('CHANDRA', 24, 112, 7) + noise(24, 184, 19, 5, 11, 12) + terminal(250, 180, 0.52, '> wit_', 13) +
  text(24, 276, 'STUDENT · EXPLORER · BUILDER', 13) + text(24, 298, 'West Bengal, India', 12, C.muted) + text(336, 298, 'be, not become.', 12, C.green, 'text-anchor="end"'));

// Section strips
for (const [name, label, n] of [['about', 'ABOUT / THE HUMAN', 1], ['stack', 'TOOLS / THE WORKBENCH', 2], ['projects', 'BUILD / SELECTED WORK', 3], ['activity', 'ACTIVITY / COMMIT LOG', 4], ['notes', 'READ / FIELD NOTES', 5], ['contact', 'CONNECT / SAY HELLO', 6]]) {
  svg(`section-${name}.svg`, 900, 54, label, text(20, 34, label, 20) + noise(566, 20, 26, 2, 10, n));
  svg(`section-${name}-mobile.svg`, 360, 44, label, text(14, 28, label, 14) + noise(222, 12, 13, 2, 10, n));
}

// Project cards. Desktop cards sit in a 2-column table; below 600px each cell is only
// ~150px wide, so the mobile tile keeps just the title, kind and stack, in larger type.
const projects = [
  { slug: 'osho-documentary', n: '01', title: 'Osho Documentary', kind: 'RESEARCH / INTERACTIVE ARCHIVE', lines: ['Evidence-graded archive on Osho and', 'Rajneeshpuram, with timeline and map.'], tech: 'Next.js · TypeScript', motif: 'archive', m: { title: ['Osho', 'Documentary'], kind: 'Interactive archive', tech: ['Next.js', 'TypeScript'] } },
  { slug: 'declutter', n: '02', title: 'Declutter', kind: 'UTILITY / WINDOWS APP', lines: ['Sorts a messy folder, finds duplicates.', 'Previews first. Never permanently deletes.'], tech: 'Python', motif: 'sort', m: { title: ['Declutter'], kind: 'Windows app', tech: ['Python'] } },
  { slug: 'advaita-website', n: '03', title: 'advaitachandra.in', kind: 'WEBSITE / PUBLIC NOTEBOOK', lines: ['Personal site and public notebook:', 'projects, reading notes, photography.'], tech: 'React · Vite · Tailwind · Supabase', motif: 'grid', m: { title: ['advaitachandra.in'], kind: 'Personal site', tech: ['React · Vite', 'Tailwind · Supabase'] } },
  { slug: 'supportadvaita', n: '04', title: 'Support page', kind: 'WEB / UPI', lines: ['Zero-fee UPI page to support my independent', 'software, research, photography, philosophy.'], tech: 'JavaScript', motif: 'upi', m: { title: ['Support page'], kind: 'UPI page', tech: ['JavaScript'] } },
];
// Motif drawn in a 170x40 box with its origin at (0,0).
const motif = kind => ({
  archive: `<path d="M0 27h170" stroke="${C.line}"/>` + [0, 1, 2, 3, 4].map(i => `<rect x="${i * 40}" y="${3 + (i % 2) * 12}" width="6" height="${24 - (i % 2) * 12}" fill="${i === 3 ? C.green : '#55704b'}"/>`).join(''),
  sort: [95, 70, 120].map((w, i) => `<rect x="0" y="${1 + i * 11}" width="${w}" height="6" fill="${i === 1 ? C.green : '#55704b'}"/>`).join(''),
  grid: noise(0, 0, 13, 3, 9, 5),
  upi: text(0, 27, '[ ₹ ]', 30, C.green) + `<path d="M126 17h44" stroke="${C.line}" stroke-dasharray="4 6"/>`,
})[kind];
for (const p of projects) {
  const alt = p.title + '. ' + p.lines.join(' ') + ' ' + p.tech + '.';
  svg(`card-${p.slug}.svg`, 440, 240, alt,
    `<rect x=".5" y=".5" width="439" height="239" rx="4" fill="none" stroke="${C.line}"/>` + text(22, 30, p.kind, 11, C.muted) + text(417, 30, p.n, 13, C.green, 'text-anchor="end"') + `<path d="M22 45h396" stroke="${C.line}"/>` +
    `<g transform="translate(24 58)">${motif(p.motif)}</g>` + text(22, 126, p.title, 24) + p.lines.map((line, i) => text(22, 157 + i * 21, line, 14, C.muted)).join('') +
    `<path d="M22 198h396" stroke="${C.line}"/>` + text(22, 221, p.tech, 12, C.green) + text(416, 222, '↗', 19, C.green, 'text-anchor="end"'));
  let y = 94, body = `<rect x=".5" y=".5" width="169" height="199" rx="4" fill="none" stroke="${C.line}"/>` + text(12, 22, p.n, 12, C.green) + text(158, 24, '↗', 16, C.green, 'text-anchor="end"') + `<g transform="translate(12 34) scale(.82)">${motif(p.motif)}</g>`;
  for (const line of p.m.title) { body += text(12, y, line, line.length * 14 * 0.62 <= 146 ? 14 : 13); y += 18; }
  body += text(12, y + 2, p.m.kind, 11, C.muted) + `<path d="M12 ${y + 14}h146" stroke="${C.line}"/>`; y += 33;
  for (const line of p.m.tech) { body += text(12, y, line, 11, C.green); y += 16; }
  svg(`card-${p.slug}-mobile.svg`, 170, 200, alt, body);
}

// Activity panel
const snapshot = JSON.parse(readFileSync(new URL('../data/activity.json', import.meta.url), 'utf8'));
const end = new Date(snapshot.asOf + 'T00:00:00Z'), start = new Date(end); start.setUTCDate(end.getUTCDate() - 90);
const until = new Date(+end + 86400000);
const counts = {};
for (const r of snapshot.repositories) for (const c of r.commits) { const d = new Date(c.date); if (d >= start && d < until) counts[c.date.slice(0, 10)] = (counts[c.date.slice(0, 10)] ?? 0) + 1; }
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const heat = (x0, y0, stepX, w, stepY, h) => {
  let out = '';
  for (let i = 0; i < 91; i++) {
    const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
    const v = counts[d.toISOString().slice(0, 10)] ?? 0;
    const fill = v > 9 ? '#c1e99b' : v > 4 ? '#85bc61' : v > 1 ? '#537d40' : v ? '#345330' : '#232e25';
    out += `<rect x="${x0 + Math.floor(i / 7) * stepX}" y="${y0 + (i % 7) * stepY}" width="${w}" height="${h}" rx="2" fill="${fill}"><title>${d.toISOString().slice(0, 10)}: ${v} commits</title></rect>`;
  }
  return out;
};
const repoCount = `${snapshot.repositories.length} public repositories`;
const note = `Default-branch history through ${snapshot.asOf} UTC`;
const activityTitle = `Public repository commit activity. ${total} commits in the last 91 days.`;
svg('activity.svg', 900, 278, activityTitle,
  text(30, 36, 'PUBLIC WORK / LAST 91 DAYS', 15) + text(870, 36, `${total} commits`, 15, C.green, 'text-anchor="end"') + heat(30, 60, 38, 30, 20, 14) +
  text(565, 94, 'SMALL THINGS.', 24) + text(565, 126, 'STEADY WORK.', 24, C.green) + text(565, 163, repoCount, 13, C.muted) + text(565, 188, 'One commit at a time.', 13, C.muted) +
  text(30, 230, note, 12, C.muted) + text(30, 253, 'Merges included, bots excluded. Not GitHub contribution totals.', 11, C.muted));
svg('activity-mobile.svg', 360, 356, activityTitle,
  text(12, 28, 'PUBLIC WORK / 91 DAYS', 12) + text(348, 28, `${total} commits`, 12, C.green, 'text-anchor="end"') + heat(12, 44, 26, 22, 18, 14) +
  text(12, 204, 'SMALL THINGS.', 20) + text(12, 230, 'STEADY WORK.', 20, C.green) + text(12, 254, repoCount, 12, C.muted) + text(12, 274, 'One commit at a time.', 12, C.muted) +
  text(12, 306, note, 11, C.muted) + text(12, 324, 'Merges included, bots excluded.', 11, C.muted) + text(12, 342, 'Not GitHub contribution totals.', 11, C.muted));

// Footer
svg('footer.svg', 900, 80, 'Be, not become.', noise(24, 28, 8, 2, 10, 8) + text(450, 46, 'be, not become.', 20, C.green, 'text-anchor="middle"') + text(874, 46, '/ wit', 14, C.muted, 'text-anchor="end"'));
svg('footer-mobile.svg', 360, 64, 'Be, not become.', noise(14, 22, 6, 2, 10, 8) + text(190, 38, 'be, not become.', 16, C.green, 'text-anchor="middle"') + text(346, 38, '/ wit', 12, C.muted, 'text-anchor="end"'));
console.log('Built pixel banner, section strips, project cards, activity panel, and footer (desktop + mobile).');
