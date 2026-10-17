// Generates the static SVGs in assets/. Run: node scripts/build-assets.mjs
// Self-contained monochrome panels: GitHub renders SVGs via <img>, so no webfonts, hover or script.
// Each panel carries its own near-black ground, so it reads the same in GitHub's light and dark themes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { picture } from './typeset.mjs';

const C = { bg: '#0B0B0B', white: '#F5F5F2', grey: '#A3A3A3', dim: '#737373', line: '#303030' };
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Consolas,monospace";
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const svg = (w, h, title, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">\n<title>${esc(title)}</title>\n${body}\n</svg>\n`;
const panel = (w, h) =>
  `<rect width="${w}" height="${h}" rx="4" fill="${C.bg}"/><rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="3.5" fill="none" stroke="${C.line}"/>`;
// dim (#737373) is below 4.5:1 on the ground, so it is reserved for non-text rules; all text is grey or white.
const mono = (x, y, t, o = '') =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="13" letter-spacing="2.2" fill="${C.grey}" ${o}>${esc(t)}</text>`;

const files = {};

// Hero: masthead, wordmark, standfirst.
files['hero.svg'] = svg(900, 344, 'w1tneess. Student, explorer, builder. A mind under construction.', `
${panel(900, 344)}
${mono(48, 56, 'STUDENT · EXPLORER · BUILDER')}
${mono(852, 56, 'WEST BENGAL, IN', 'text-anchor="end"')}
<line x1="48" y1="78" x2="852" y2="78" stroke="${C.line}"/>
<text x="44" y="196" font-family="${SERIF}" font-size="104" font-weight="700" letter-spacing="-3" fill="${C.white}">w1tneess.</text>
<line x1="48" y1="232" x2="852" y2="232" stroke="${C.line}"/>
<text x="48" y="276" font-family="${SERIF}" font-size="26" font-style="italic" fill="${C.white}">A mind under construction.</text>
<text x="48" y="314" font-family="${SANS}" font-size="15" fill="${C.grey}">Building little things, questioning large ones, and documenting what seems worth understanding.</text>`);

// Navigation pills.
const pills = { projects: 'Projects', notes: 'Field notes', philosophy: 'Philosophy', photography: 'Photography', contact: 'Contact' };
for (const [k, label] of Object.entries(pills)) {
  const w = (44 + label.length * 8.6) | 0;
  files[`pill-${k}.svg`] = svg(w, 40, label, `
<rect x=".5" y=".5" width="${w - 1}" height="39" rx="19.5" fill="${C.bg}" stroke="${C.line}"/>
<text x="${w / 2}" y="25" font-family="${SANS}" font-size="14" font-weight="500" text-anchor="middle" fill="${C.white}">${esc(label)}</text>`);
}

// Buttons: Live is the filled primary, Source the outlined secondary, so the pair differs by form, not colour.
const btn = (name, label, w, filled) =>
  (files[`btn-${name}.svg`] = svg(w, 36, label, `
<rect x=".5" y=".5" width="${w - 1}" height="35" rx="17.5" fill="${filled ? C.white : C.bg}" stroke="${filled ? C.grey : C.line}"/>
<text x="${w / 2}" y="23" font-family="${SANS}" font-size="14" font-weight="600" text-anchor="middle" fill="${filled ? C.bg : C.white}">${esc(label)}</text>`));
btn('live', 'Live ↗', 100, true);
btn('source', 'Source ↗', 110, false);
// Single primary call to action: off-white fill, dark text, dark hairline so it also holds on a white page.
files['btn-support.svg'] = svg(200, 44, 'Support my work', `
<rect x=".5" y=".5" width="199" height="43" rx="21.5" fill="${C.white}" stroke="${C.line}"/>
<text x="100" y="28" font-family="${SERIF}" font-size="18" font-style="italic" text-anchor="middle" fill="${C.bg}">Support my work ↗</text>`);

// Project cards: editorial feature panels with a monochrome motif drawn from what the project does.
const motifs = {
  timeline: () => `<line x1="0" y1="40" x2="300" y2="40" stroke="${C.line}"/>` + [0, 1, 2, 3, 4, 5].map((i) => `<line x1="${i * 56}" y1="40" x2="${i * 56}" y2="${i % 2 ? 12 : 0}" stroke="${C.white}"/><circle cx="${i * 56}" cy="${i % 2 ? 12 : 0}" r="3" fill="${C.white}"/>`).join(''),
  sort: () => [0, 1, 2, 3].map((i) => `<rect x="0" y="${i * 11}" width="${220 - i * 48}" height="5" fill="${i ? C.line : C.white}"/>`).join(''),
  grid: () => [0, 1, 2].flatMap((r) => [0, 1, 2, 3, 4, 5].map((c) => `<rect x="${c * 36}" y="${r * 15}" width="28" height="9" fill="${r + c === 0 ? C.white : C.line}"/>`)).join(''),
  rupee: () => `<text x="0" y="40" font-family="${SERIF}" font-size="52" fill="${C.white}">₹</text><line x1="48" y1="26" x2="300" y2="26" stroke="${C.line}" stroke-dasharray="2 6"/>`,
};
const cards = [
  ['osho-documentary', '01', 'ARCHIVE', 'Osho Documentary', 'Evidence-graded interactive archive on Osho and Rajneeshpuram, with timeline and map.', ['Next.js', 'TypeScript'], 'timeline'],
  ['declutter', '02', 'DESKTOP APP', 'Declutter', 'Windows app that sorts a messy folder and finds duplicates. Previews first, never permanently deletes.', ['Python'], 'sort'],
  ['advaita-website', '03', 'WEBSITE', 'advaitachandra.in', 'Personal site and public notebook, pre-rendered with a Supabase-backed admin.', ['React', 'Vite', 'Tailwind', 'Supabase'], 'grid'],
  ['supportadvaita', '04', 'SUPPORT PAGE', 'Support page', 'Zero-fee UPI page for supporting independent software, research and photography.', ['JavaScript'], 'rupee'],
];
const wrap = (s, n) => {
  const lines = [''];
  for (const w of s.split(' ')) {
    if ((lines.at(-1) + ' ' + w).trim().length > n) lines.push(w);
    else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim();
  }
  return lines;
};
for (const [slug, no, kind, name, desc, tech, motif] of cards) {
  let x = 24;
  const tags = tech.map((t) => {
    const w = (22 + t.length * 7.6) | 0;
    const g = `<rect x="${x + 0.5}" y="226.5" width="${w}" height="26" rx="13" fill="none" stroke="${C.line}"/><text x="${x + w / 2}" y="243.5" font-family="${MONO}" font-size="12.5" text-anchor="middle" fill="${C.grey}">${esc(t)}</text>`;
    x += w + 8;
    return g;
  }).join('');
  const lines = wrap(desc, 50).map((l, i) => `<text x="24" y="${170 + i * 20}" font-family="${SANS}" font-size="14" fill="${C.grey}">${esc(l)}</text>`).join('');
  files[`card-${slug}.svg`] = svg(440, 272, `${no}. ${name}. ${desc} ${tech.join(', ')}.`, `
${panel(440, 272)}
${mono(24, 38, kind)}
<text x="416" y="40" font-family="${SERIF}" font-size="22" text-anchor="end" fill="${C.white}">${no}</text>
<line x1="24" y1="54" x2="416" y2="54" stroke="${C.line}"/>
<g transform="translate(24 72)">${motifs[motif]()}</g>
<text x="24" y="146" font-family="${SERIF}" font-size="27" font-weight="700" fill="${C.white}">${esc(name)}</text>
${lines}${tags}`);
}

// Section headings: serif, regular weight, light/dark pair (README references these by stable name).
for (const [name, text] of Object.entries({ 'right-now': 'Right now', 'selected-work': 'Selected work', explorations: 'Current explorations', 'field-notes': 'Field notes', contact: 'Contact' })) {
  picture(text, { size: 36, spacing: -0.4 }, { dir: 'assets/headings', name, stable: true });
}

mkdirSync('assets', { recursive: true });
for (const [f, s] of Object.entries(files)) writeFileSync(`assets/${f}`, s);
console.log(`wrote ${Object.keys(files).length} files`);
