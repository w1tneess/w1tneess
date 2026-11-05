// Draws the README hero and project showcase, in a dark and a light theme, for desktop and phone.
// Run: node scripts/build-art.mjs   (no dependencies, no network, deterministic)
// README.md picks the right file with <picture><source media>. Colours live in art-themes.mjs.
// SVG text uses system font stacks, so the build estimates widths conservatively and throws if
// any line could overflow its image or overlap another line.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES } from './art-themes.mjs';

const OUT = process.env.ASSET_DIR ?? fileURLToPath(new URL('../assets/', import.meta.url));
const SERIF = "Georgia,'Noto Serif','DejaVu Serif','Times New Roman',serif";
const SANS = "system-ui,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Average glyph width per em, deliberately on the wide side of the likely fallback fonts.
const EM = { serif: 0.58, sans: 0.56, caps: 0.7 };
let boxes = [];
function text(x, y, s, { size, fill, serif = false, caps = false, ls = 0, anchor = 'start' } = {}) {
  const w = [...s].length * (size * EM[caps ? 'caps' : serif ? 'serif' : 'sans'] + ls);
  const left = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  boxes.push({ s, l: left, r: left + w, t: y - size * 0.8, b: y + size * 0.25 });
  const attrs = `font-family="${serif ? SERIF : SANS}" font-size="${size}" fill="${fill}"${ls ? ` letter-spacing="${ls}"` : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}`;
  return `<text x="${x}" y="${y}" ${attrs}>${esc(s)}</text>`;
}

function art(name, w, h, label, draw) {
  for (const [theme, T] of Object.entries(THEMES)) {
    boxes = [];
    const body = draw(T);
    for (const [i, a] of boxes.entries()) {
      if (a.l < 12 || a.r > w - 12) throw new Error(`${theme}/${name}: "${a.s}" may leave the image (${a.l.toFixed(0)}..${a.r.toFixed(0)} of ${w})`);
      for (const b of boxes.slice(i + 1)) if (a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b) throw new Error(`${theme}/${name}: "${a.s}" may overlap "${b.s}"`);
    }
    const file = name.replace('.svg', `-${theme}.svg`);
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, file), `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${body}</svg>\n`);
  }
}

const frame = (T, w, h) => `<rect width="${w}" height="${h}" rx="22" fill="url(#bg)"/><rect width="${w}" height="${h}" rx="22" fill="url(#grid)"/>`;
const defsBase = (T, w, h) => `<linearGradient id="bg" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse"><stop stop-color="${T.bgA}"/><stop offset=".55" stop-color="${T.bgB}"/><stop offset="1" stop-color="${T.bgC}"/></linearGradient><pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" stroke="${T.grid}" stroke-opacity="${T.gridOpacity}"/></pattern>`;
const border = (T, w, h) => `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="21.5" stroke="${T.frame}" stroke-opacity="${T.frameOpacity}"/>`;

// The orb, centred at (888,190) with radius 126; rings are optional.
function orb(T, rings) {
  const orbDefs = `<radialGradient id="orb" cx="0" cy="0" r="1" gradientTransform="matrix(130 180 -170 123 875 140)" gradientUnits="userSpaceOnUse"><stop stop-color="#E8F1FF"/><stop offset=".18" stop-color="#A8C4E8"/><stop offset=".48" stop-color="#536E9B"/><stop offset=".78" stop-color="#263B5D"/><stop offset="1" stop-color="#101827"/></radialGradient>
<linearGradient id="ring" x1="650" y1="50" x2="1090" y2="380" gradientUnits="userSpaceOnUse"><stop stop-color="${T.ringGold}" stop-opacity=".9"/><stop offset=".48" stop-color="${T.ringBlue}" stop-opacity=".5"/><stop offset="1" stop-color="${T.ringBlue}" stop-opacity=".04"/></linearGradient>
<linearGradient id="shine" x1="760" y1="80" x2="970" y2="300" gradientUnits="userSpaceOnUse"><stop stop-color="white" stop-opacity=".48"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>
<filter id="blur" x="550" y="-100" width="700" height="650" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="42"/></filter>
<filter id="shadow" x="650" y="0" width="480" height="470" color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="22"/></filter>`;
  const ringPaths = rings ? `<path d="M660 224C706 65 927 10 1076 124C1190 212 1105 370 946 387C790 404 622 346 660 224Z" stroke="url(#ring)" stroke-width="1.4"/><path d="M700 220C750 83 940 45 1058 148C1145 224 1075 339 950 356C827 373 672 323 700 220Z" stroke="${T.ringSoft}" stroke-opacity=".28"/><circle cx="1050" cy="95" r="4" fill="${T.dot}"/><circle cx="710" cy="320" r="3" fill="${T.ringSoft}"/>` : `<circle cx="888" cy="190" r="150" stroke="url(#ring)" stroke-width="2.5"/><circle cx="1010" cy="92" r="6" fill="${T.dot}"/>`;
  const body = `<circle cx="910" cy="210" r="170" fill="${T.glow}" fill-opacity="${T.glowOpacity}" filter="url(#blur)"/>${ringPaths}<circle cx="888" cy="212" r="126" fill="${T.shadow}" fill-opacity="${T.shadowOpacity}" filter="url(#shadow)"/><circle cx="888" cy="190" r="126" fill="url(#orb)"/><path d="M800 105C841 65 918 52 974 94C1002 115 1013 143 1013 165C970 128 909 119 852 137C821 147 794 166 776 190C773 158 780 127 800 105Z" fill="url(#shine)"/><path d="M782 237C822 287 908 321 983 282" stroke="#D9E7FA" stroke-opacity=".3" stroke-width="2" stroke-linecap="round"/>`;
  return { defs: orbDefs, body };
}

// ---- hero -----------------------------------------------------------------------------------
const heroLabel = 'Advaita Chandra — student, developer, explorer. Building interfaces. Exploring ideas. Keeping notes.';
art('hero.svg', 1200, 440, heroLabel, T => {
  const o = orb(T, true);
  return `<defs>${defsBase(T, 1200, 440)}${o.defs}</defs>${frame(T, 1200, 440)}${o.body}<path d="M84 82H144" stroke="${T.gold}" stroke-width="2"/>` +
    text(84, 118, 'W1TNEESS / PERSONAL GITHUB', { size: 15, fill: T.gold, caps: true, ls: 4 }) +
    text(80, 214, 'Advaita Chandra', { size: 66, fill: T.title, serif: true, ls: -2 }) +
    text(84, 262, 'STUDENT · DEVELOPER · EXPLORER', { size: 20, fill: T.sub, caps: true, ls: 2 }) +
    text(84, 322, 'Building interfaces. Exploring ideas. Keeping notes.', { size: 18, fill: T.body }) +
    text(84, 382, 'SOFTWARE / PHILOSOPHY / PHOTOGRAPHY', { size: 13, fill: T.faint, caps: true, ls: 3 }) + border(T, 1200, 440);
});
art('hero-mobile.svg', 390, 350, heroLabel, T => {
  const o = orb(T, false);
  return `<defs>${defsBase(T, 390, 350)}${o.defs}</defs>${frame(T, 390, 350)}<g transform="translate(300 96) scale(.4) translate(-888 -190)">${o.body}</g><path d="M24 22H64" stroke="${T.gold}" stroke-width="2"/>` +
    text(24, 46, 'W1TNEESS / GITHUB', { size: 12, fill: T.gold, caps: true, ls: 3 }) +
    text(24, 184, 'Advaita', { size: 58, fill: T.title, serif: true, ls: -1.5 }) + text(24, 247, 'Chandra', { size: 58, fill: T.title, serif: true, ls: -1.5 }) +
    text(24, 282, 'STUDENT · DEVELOPER · EXPLORER', { size: 13.5, fill: T.sub, caps: true, ls: 1.5 }) +
    text(24, 310, 'Building interfaces. Exploring ideas.', { size: 15, fill: T.body }) + text(24, 330, 'Keeping notes.', { size: 15, fill: T.body }) + border(T, 390, 350);
});

// ---- project showcase -----------------------------------------------------------------------
// Reading order is 01..04, left to right then down. The five-project list is native text in README.md.
const projects = [
  { n: '01', kind: 'DOCUMENTARY', title: 'Osho Documentary', icon: 'orb', tech: 'NEXT.JS · TYPESCRIPT', lines: ['Evidence-graded archive on Osho and Rajneeshpuram,', 'with an archival timeline and map.'], short: ['Evidence-graded archive on Osho and', 'Rajneeshpuram, with timeline and map.'] },
  { n: '02', kind: 'WINDOWS APP', title: 'Declutter', icon: 'A', tech: 'PYTHON', lines: ['Sorts a messy folder and finds duplicates.', 'Previews first. Never permanently deletes.'], short: ['Sorts a messy folder, finds duplicates.', 'Previews first. Never permanently deletes.'] },
  { n: '03', kind: 'PERSONAL SITE', title: 'advaitachandra.in', icon: 'doc', tech: 'REACT · VITE · TAILWIND · SUPABASE', lines: ['A public notebook of projects, reading notes', 'and photography.'], short: ['A public notebook of projects,', 'reading notes and photography.'] },
  { n: '04', kind: 'WEB UI FOR CASAOS', title: 'w1tOS', icon: 'rings', tech: 'VUE · FORK OF CASAOS-UI', lines: ['A minimal, keyboard-first web UI for CasaOS', 'home servers. Three themes, no telemetry.'], short: ['Keyboard-first web UI for CasaOS', 'home servers. Three themes.'] },
];
const iconDefs = T => `<linearGradient id="blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#91B8E8"/><stop offset="1" stop-color="#314E79"/></linearGradient><filter id="lift" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="${T.shadow}" flood-opacity="${T.cardShadowOpacity}"/></filter>`;
// Icons are drawn around (0,0).
const icon = (T, kind) => ({
  orb: `<circle r="35" fill="url(#blue)" fill-opacity=".9"/><circle r="47" stroke="${T.tileBlue}" stroke-opacity=".35"/><path d="M-36 0H36M0 -36V36" stroke="#DDEBFA" stroke-opacity=".28"/>`,
  A: `<rect x="-33" y="-35" width="66" height="70" rx="12" fill="${T.tileGold}" fill-opacity=".1" stroke="${T.tileGold}" stroke-opacity=".5"/><path d="M-17 18L0 -19L17 18M-11 6H11" stroke="${T.tileGold}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  doc: `<rect x="-33" y="-35" width="66" height="70" rx="12" fill="${T.tileBlue}" fill-opacity=".1" stroke="${T.tileBlue}" stroke-opacity=".5"/><rect x="-16" y="-19" width="32" height="38" rx="4" stroke="${T.tileBlue}" stroke-width="2"/><path d="M-9 -9H9M-9 -1H5M-9 7H2" stroke="${T.tileBlue}" stroke-width="2" stroke-linecap="round"/>`,
  rings: `<circle r="31" stroke="${T.tileBlue}" stroke-width="2" stroke-opacity=".8"/><circle r="19" stroke="${T.tileGold}" stroke-opacity=".8"/><circle r="5" fill="${T.tileGold}"/>`,
})[kind];

const showcaseLabel = 'Selected work: Osho Documentary, Declutter, advaitachandra.in and w1tOS.';
art('showcase.svg', 1000, 520, showcaseLabel, T => {
  let out = `<defs>${defsBase(T, 1000, 520)}${iconDefs(T)}</defs>${frame(T, 1000, 520)}` +
    text(48, 52, 'SELECTED WORK / 2025—2026', { size: 12, fill: T.gold, caps: true, ls: 3 }) + text(48, 86, 'Things made with curiosity.', { size: 28, fill: T.title, serif: true });
  projects.forEach((p, i) => {
    const x = 48 + (i % 2) * 468, y = 112 + Math.floor(i / 2) * 190, fill = (i === 0 || i === 3) ? T.cardA : T.cardB;
    out += `<rect x="${x}" y="${y}" width="436" height="168" rx="14" fill="${fill}" stroke="${T.cardLine}" filter="url(#lift)"/><g transform="translate(${x + 376} ${y + 52}) scale(.85)">${icon(T, p.icon)}</g>` +
      text(x + 28, y + 38, `${p.n} / ${p.kind}`, { size: 11.5, fill: T.gold, caps: true, ls: 2 }) + text(x + 28, y + 80, p.title, { size: 26, fill: T.cardTitle, serif: true }) +
      p.lines.map((l, k) => text(x + 28, y + 112 + k * 20, l, { size: 13.5, fill: T.body })).join('') + text(x + 28, y + 152, p.tech, { size: 11.5, fill: T.blue, caps: true, ls: 1 });
  });
  return out + text(48, 498, 'W1TNEESS / BUILD • LEARN • REPEAT', { size: 12, fill: T.faint, caps: true, ls: 2 }) + border(T, 1000, 520);
});
art('showcase-mobile.svg', 390, 680, showcaseLabel, T => {
  let out = `<defs>${defsBase(T, 390, 680)}${iconDefs(T)}</defs>${frame(T, 390, 680)}` +
    text(24, 38, 'SELECTED WORK / 2025—2026', { size: 12, fill: T.gold, caps: true, ls: 2.5 }) + text(24, 72, 'Things made with curiosity.', { size: 21, fill: T.title, serif: true });
  projects.forEach((p, i) => {
    const x = 24, y = 96 + i * 136, fill = (i === 0 || i === 3) ? T.cardA : T.cardB;
    out += `<rect x="${x}" y="${y}" width="342" height="124" rx="14" fill="${fill}" stroke="${T.cardLine}" filter="url(#lift)"/><g transform="translate(${x + 300} ${y + 38}) scale(.5)">${icon(T, p.icon)}</g>` +
      text(x + 18, y + 26, `${p.n} / ${p.kind}`, { size: 11.5, fill: T.gold, caps: true, ls: 1.5 }) + text(x + 18, y + 54, p.title, { size: 22, fill: T.cardTitle, serif: true }) +
      p.short.map((l, k) => text(x + 18, y + 76 + k * 17, l, { size: 12.5, fill: T.body })).join('') + text(x + 18, y + 114, p.tech, { size: 11, fill: T.blue, caps: true, ls: 1 });
  });
  return out + text(24, 660, 'W1TNEESS / BUILD • LEARN • REPEAT', { size: 11, fill: T.faint, caps: true, ls: 2 }) + border(T, 390, 680);
});
console.log('Built hero and showcase: dark + light, desktop + mobile.');
