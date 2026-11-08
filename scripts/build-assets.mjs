// Generates the README artwork (light + dark) into assets/ and writes README.md.
// Run: node scripts/build-assets.mjs [--readme]  (README is now hand-kept in profile-readme-generator format)   (needs network once, for brand icon paths)
import { mkdirSync, writeFileSync, readdirSync, unlinkSync, readFileSync } from "node:fs";
const ART = readFileSync(new URL("./hero-art.gif", import.meta.url)).toString("base64"); // pixel-art desk, animated

const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const SERIF = "Georgia,'Times New Roman',serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const OWNER = "w1tneess";
const RAW = `https://raw.githubusercontent.com/${OWNER}/${OWNER}`;

// "Cyberminimalism" palette: #000000 #0A0A0A #141414 #383838 #F0F0F0
const THEMES = {
  dark: { text: "#f0f0f0", muted: "#8f8f8f", border: "#383838", bg: "#0a0a0a", card: "#141414", a: "#f0f0f0", b: "#8f8f8f", on: "#0a0a0a", dot: "#ffffff0f", glow: 0.1 },
  light: { text: "#0a0a0a", muted: "#5c5c5c", border: "#c9c9c9", bg: "#fafafa", card: "#ffffff", a: "#0a0a0a", b: "#5c5c5c", on: "#f0f0f0", dot: "#0000000f", glow: 0.08 },
};
const grad = (id, t) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient>`;

// ---- brand icon paths (simple-icons, single 24x24 path each) ----
const ICON_VERSION = "13.21.0";
const iconPath = async (slug) => {
  const r = await fetch(`https://cdn.jsdelivr.net/npm/simple-icons@${ICON_VERSION}/icons/${slug}.svg`);
  if (!r.ok) return null;
  return (await r.text()).match(/ d="([^"]+)"/)?.[1] ?? null;
};
const GLOBE = "M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c.9 1.1 1.7 2.8 2.1 5H9.9C10.3 6.8 11.1 5.1 12 4zM4.3 11a8 8 0 015.1-6.6C8.8 5.7 8.2 8 8 11H4.3zm0 2H8c.2 3 .8 5.3 1.4 6.6A8 8 0 014.3 13zM12 20c-.9-1.1-1.7-2.8-2.1-5h4.2c-.4 2.2-1.2 3.9-2.1 5zm2.1-7H9.9a17 17 0 010-2h4.2a17 17 0 010 2zm.5 6.6c.6-1.3 1.2-3.6 1.4-6.6h3.7a8 8 0 01-5.1 6.6zM16 11c-.2-3-.8-5.3-1.4-6.6A8 8 0 0119.7 11H16z";
const glyph = (d, x, y, size, fill) => `<g transform="translate(${x} ${y}) scale(${size / 24})"><path d="${d}" fill="${fill}"/></g>`;

// ---- hero: a slowly spinning wireframe globe with an orbit, over a floor that flows toward you ----
// Pure SVG animation (SMIL + CSS) because GitHub shows READMEs' SVGs as <img>: no scripts, no hover.
const f1 = (n) => n.toFixed(1);
const rad = (d) => (d * Math.PI) / 180;
const range = (a, b, n) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

function hero(t) {
  const W = 1200, H = 400, HZ = 272, bg = t.bg;
  const G = { x: 880, y: 164, r: 100, tilt: rad(22) };
  // sphere (lat, lon) -> [screenX, screenY, depth]; tilted so the north pole leans toward the viewer
  const sp = (lat, lon) => {
    const x = Math.cos(lat) * Math.sin(lon), y = Math.sin(lat), z = Math.cos(lat) * Math.cos(lon);
    const y2 = y * Math.cos(G.tilt) - z * Math.sin(G.tilt), z2 = y * Math.sin(G.tilt) + z * Math.cos(G.tilt);
    return [G.x + G.r * x, G.y - G.r * y2, z2];
  };
  const poly = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${f1(p[0])} ${f1(p[1])}`).join("");
  const split = (pts) => { // static curves: front and back runs
    const o = { f: "", b: "" }; let prev = null;
    for (const p of pts) { const k = p[2] >= 0 ? "f" : "b"; if (prev && prev !== k) o[prev] += `L${f1(p[0])} ${f1(p[1])}`; o[k] += `${prev === k ? "L" : "M"}${f1(p[0])} ${f1(p[1])}`; prev = k; }
    return o;
  };

  // Meridians: with the tilt, every pole-to-pole half meridian crosses from back to front exactly once,
  // so each frame has the same command structure and SMIL can interpolate the paths smoothly.
  const STEP = 20, FRAMES = 10, N = 14;
  const meridians = (theta) => {
    const o = { f: "", b: "" };
    for (let k = 0; k < 360 / STEP; k++) {
      const lon = rad(k * STEP + theta);
      const c = Math.atan(-Math.cos(lon) * Math.cos(G.tilt) / Math.sin(G.tilt)); // latitude where depth = 0
      o.f += poly(range(c, Math.PI / 2, N).map((lat) => sp(lat, lon)));
      o.b += poly(range(-Math.PI / 2, c, N).map((lat) => sp(lat, lon)));
    }
    return o;
  };
  const frames = range(0, STEP, FRAMES + 1).map(meridians);
  const spin = (side) => `<path d="${frames[0][side]}"><animate attributeName="d" dur="2.4s" repeatCount="indefinite" values="${frames.map((f) => f[side]).join(";")}"/></path>`;
  const par = [-60, -30, 0, 30, 60].map((d) => split(range(0, 360, 73).map((l) => sp(rad(d), rad(l)))));

  // Orbit ring, nearly edge-on, with a dot that dims while it passes behind the globe
  const R = 164, beta = rad(12), gam = rad(-14);
  const orb = (a) => {
    const x = R * Math.cos(a), y = -R * Math.sin(a) * Math.sin(beta), z = R * Math.sin(a) * Math.cos(beta);
    return [G.x + x * Math.cos(gam) - y * Math.sin(gam), G.y - (x * Math.sin(gam) + y * Math.cos(gam)), z];
  };
  const ring = split(range(0, 2 * Math.PI, 97).map(orb));
  const dot = range(0, 2 * Math.PI, 73).map(orb);
  const anim = (attr, vals) => `<animate attributeName="${attr}" dur="9s" repeatCount="indefinite" values="${vals.join(";")}"/>`;

  // Floor: lines to a vanishing point under the globe, plus rows that travel toward the viewer
  const rays = range(-1200, 2400, 46).map((xb) => `M${G.x} ${HZ}L${f1(xb)} ${H}`).join("");
  const ROWS = 9, DUR = 4.5, ys = range(0, 1, 13).map((s) => f1(HZ + (H + 20 - HZ) * s ** 2.2));
  const rows = range(0, ROWS - 1, ROWS).map((i) => `<line x1="0" x2="${W}" y1="${HZ}" y2="${HZ}"><animate attributeName="y1" dur="${DUR}s" begin="-${f1((i * DUR) / ROWS)}s" repeatCount="indefinite" values="${ys.join(";")}"/><animate attributeName="y2" dur="${DUR}s" begin="-${f1((i * DUR) / ROWS)}s" repeatCount="indefinite" values="${ys.join(";")}"/></line>`).join("");

  // Typewriter tagline: a background-coloured cover with the cursor on its edge steps right one character at a time
  const TX = 64, TY = 236, CW = 13.2, SLOT = 4.5;
  const lines = ["> building small things", "> keeping the questions open", "> websites · little tools · archives"];
  const total = SLOT * lines.length;
  const typeCss = lines.map((l, i) => {
    const w = f1(l.length * CW), end = f1(((l.length * 0.06) / total) * 100);
    return `.l${i},.l${i} .cv{animation-delay:${i * SLOT}s}.l${i} .cv{animation-name:ty${i}}@keyframes ty${i}{0%{transform:translateX(0);animation-timing-function:steps(${l.length},end)}${end}%,100%{transform:translateX(${w}px)}}`;
  }).join("");
  const typed = lines.map((l, i) => `<g class="ln l${i}"><text x="${TX}" y="${TY}" font-family="${MONO}" font-size="22" fill="${t.text}">${esc(l)}</text><g class="cv"><rect x="${TX}" y="${TY - 24}" width="${f1(l.length * CW + 40)}" height="34" fill="${bg}"/><rect class="cur" x="${TX + 1}" y="${TY - 19}" width="11" height="24" fill="${t.text}" fill-opacity=".8"/></g></g>`).join("");

  const label = (x, y, s, anchor = "start") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${MONO}" font-size="16" fill="${t.muted}">${s}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Advaita Chandra, w1tneess</title><desc id="d">A pixel-art desk with a glowing monitor. Building small things, keeping the questions open. Websites, little tools and archives, from West Bengal, India.</desc>
<defs><clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>
<linearGradient id="af" x1="${W * 0.46}" x2="${W * 0.72}" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="am"><rect width="${W}" height="${H}" fill="url(#af)"/></mask></defs>
<style>.ln{opacity:0;animation:show ${total}s infinite}.cv{animation-duration:${total}s;animation-iteration-count:infinite}@keyframes show{0%,${f1(100 / lines.length - 0.5)}%{opacity:1}${f1(100 / lines.length)}%,100%{opacity:0}}${typeCss}.cur{animation:bl 1s steps(1) infinite}@keyframes bl{50%{opacity:0}}@media (prefers-reduced-motion:reduce){.ln,.cv,.cur{animation:none}.l0{opacity:1}.cv{display:none}}</style>
<g clip-path="url(#frame)"><rect width="${W}" height="${H}" fill="${bg}"/>
<circle cx="${TX + 5}" cy="99" r="4" fill="${t.text}"/>${label(TX + 18, 104, "~/w1tneess")}
<text x="${TX - 3}" y="176" font-family="${SANS}" font-size="60" font-weight="500" letter-spacing="-1.8" fill="${t.text}">Advaita Chandra</text>
${typed}
<g mask="url(#am)"><image href="data:image/gif;base64,${ART}" x="${W * 0.4}" y="0" width="${W * 0.6}" height="${H}" preserveAspectRatio="xMidYMid slice" style="image-rendering:pixelated"/><rect x="${W * 0.4}" width="${W * 0.6}" height="${H}" fill="${bg}" fill-opacity=".18"/></g>
${label(TX, H - 48, "West Bengal, India  ·  student  ·  builder  ·  explorer")}</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${t.text}" stroke-opacity=".1"/>
</svg>`;
}

// ---- architecture of advaita-website (structure traced from GitSkins' code diagram) ----
// Wide layout so it reads at GitHub's ~880px column; solid edges carry a slow moving dash = data flow.
function arch(t) {
  const W = 1070, H = 740, NW = 176, NH = 52;
  const [c1, c2, c3, c4] = [130, 420, 680, 940];
  const r = [64, 164, 264, 364, 464, 564, 664];
  const node = (x, y, title, file) => `<rect x="${x - NW / 2 + .5}" y="${y - NH / 2 + .5}" width="${NW - 1}" height="${NH - 1}" rx="10" fill="${t.card}" stroke="${t.text}" stroke-opacity=".14"/>
<text x="${x}" y="${y - 2}" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="500" fill="${t.text}">${esc(title)}</text><text x="${x}" y="${y + 16}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${t.muted}">${esc(file)}</text>`;
  const actor = (x, y, label) => `<rect x="${x - 75 + .5}" y="${y - 22 + .5}" width="149" height="43" rx="21.5" fill="${t.bg}" stroke="${t.text}" stroke-opacity=".5"/>
<circle cx="${x - 44}" cy="${y - 4}" r="4.5" fill="none" stroke="${t.text}" stroke-width="1.5"/><path d="M${x - 52} ${y + 9}a8 7 0 0 1 16 0" fill="none" stroke="${t.text}" stroke-width="1.5"/>
<text x="${x - 30}" y="${y + 5}" font-family="${SANS}" font-size="15" font-weight="500" fill="${t.text}">${esc(label)}</text>`;
  const db = (x, y, label) => `<path d="M${x - 85} ${y - 20}v40a85 10 0 0 0 170 0v-40" fill="${t.card}" stroke="${t.text}" stroke-opacity=".5"/><ellipse cx="${x}" cy="${y - 20}" rx="85" ry="10" fill="${t.card}" stroke="${t.text}" stroke-opacity=".5"/>
<text x="${x}" y="${y + 12}" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="500" fill="${t.text}">${esc(label)}</text>`;
  const group = (x1, y1, x2, y2, label) => `<rect x="${x1 + .5}" y="${y1 + .5}" width="${x2 - x1}" height="${y2 - y1}" rx="14" fill="${t.text}" fill-opacity=".03" stroke="${t.text}" stroke-opacity=".1"/>
<text x="${x1 + 2}" y="${y1 - 10}" font-family="${MONO}" font-size="12" fill="${t.muted}">${esc(label)}</text>`;
  // orthogonal route with rounded corners
  const route = (p, rr = 10) => {
    let d = `M${p[0][0]} ${p[0][1]}`;
    for (let i = 1; i < p.length - 1; i++) {
      const [a, b, c] = [p[i - 1], p[i], p[i + 1]];
      const u = [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])], v = [Math.sign(c[0] - b[0]), Math.sign(c[1] - b[1])];
      d += `L${b[0] - u[0] * rr} ${b[1] - u[1] * rr}Q${b[0]} ${b[1]} ${b[0] + v[0] * rr} ${b[1] + v[1] * rr}`;
    }
    const z = p[p.length - 1];
    return `${d}L${z[0]} ${z[1]}`;
  };
  const lab = (x, y, s, anchor = "start") => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${MONO}" font-size="12" fill="${t.muted}" stroke="${t.bg}" stroke-width="5" stroke-linejoin="round" paint-order="stroke">${esc(s)}</text>`;
  const mid = (a, b) => (a + b) / 2;
  const v = (x, y1, y2, s) => [[[x, y1], [x, y2]], lab(x + 12, mid(y1, y2) + 4, s)];
  const E = [ // [points, label, dashed]
    [...v(c1, r[0] + 22, r[1] - 26, "requests page")],
    [...v(c1, r[1] + 26, r[2] - 26, "renders routes")],
    [...v(c1, r[2] + 26, r[3] - 26, "renders outlet")],
    [[[c1 + 88, r[3]], [c2 - 88, r[3]]], lab(mid(c1 + 88, c2 - 88), r[3] - 8, "reads content", "middle")],
    [...v(c2, r[3] + 26, r[4] - 26, "loads document")],
    [...v(c2, r[4] + 26, r[5] - 26, "falls back to seed"), true],
    [[[c2 + 88, r[4] + 12], [c3, r[4] + 12], [c3, r[5] - 26]], lab(mid(c2 + 88, c3), r[4] + 30, "fetches remote", "middle")],
    [...v(c3, r[5] + 26, r[6] - 30, "reads and writes")],
    [...v(c4, r[0] + 22, r[1] - 26, "signs in")],
    [...v(c4, r[1] + 26, r[2] - 26, "unlocks")],
    [[[c4 - 40, r[2] + 26], [c4 - 40, r[4] - 12], [c2 + 88, r[4] - 12]], lab(mid(c3 + 104, c4 - 40), r[4] - 20, "imports data", "middle")],
    [[[c4 + 40, r[2] + 26], [c4 + 40, r[5]], [c3 + 88, r[5]]], lab(mid(c3 + 88, c4 + 40), r[5] - 8, "checks health", "middle")],
    [...v(c1, r[6] - 26, r[4] + 26, "reads routes")],
    [[[c1 + 88, r[6]], [c3 - 86, r[6]]], lab(mid(c1 + 88, c3 - 86), r[6] - 8, "reads public copy", "middle"), true],
  ];
  const edges = E.map(([p, , dashed]) => dashed
    ? `<path d="${route(p)}" fill="none" stroke="${t.text}" stroke-opacity=".45" stroke-dasharray="2 5" stroke-linecap="round" marker-end="url(#ah)"/>`
    : `<path d="${route(p)}" fill="none" stroke="${t.text}" stroke-opacity=".5" marker-end="url(#ah)"/><path class="flow" d="${route(p)}" fill="none" stroke="${t.text}" stroke-opacity=".85" stroke-width="1.5"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="at ad">
<title id="at">How advaita-website works</title><desc id="ad">Visitors hit the App Router, which renders the public layout and pages; pages read content through a provider and store that syncs with Supabase Postgres and falls back to seed JSON. The site owner signs in to an admin studio that imports data and checks sync health. A pre-render script reads the route config and a public copy of the database.</desc>
<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="${t.text}" fill-opacity=".7"/></marker></defs>
<style>.flow{stroke-dasharray:3 13;animation:fl 1.4s linear infinite}@keyframes fl{to{stroke-dashoffset:-16}}@media (prefers-reduced-motion:reduce){.flow{animation:none;opacity:0}}</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.bg}" stroke="${t.text}" stroke-opacity=".1"/>
${group(c1 - 104, r[1] - 44, c1 + 104, r[4] + 42, "public site")}${group(c2 - 104, r[3] - 44, c3 + 104, r[5] + 42, "content data layer")}${group(c4 - 104, r[1] - 44, c4 + 104, r[2] + 42, "admin studio")}
${edges}${E.map((e) => e[1]).join("")}
${actor(c1, r[0], "Visitor")}${actor(c4, r[0], "Site owner")}
${node(c1, r[1], "App Router", "App.jsx")}${node(c1, r[2], "Public Layout", "PublicLayout.jsx")}${node(c1, r[3], "Public Pages", "Blog.jsx")}${node(c1, r[4], "Route Config", "nav.js")}
${node(c2, r[3], "Content Provider", "content.jsx")}${node(c2, r[4], "Content Store", "store.js")}${node(c2, r[5], "Seed JSON", "seed.js")}${node(c3, r[5], "Supabase Sync", "sync.js")}
${node(c4, r[1], "Admin Auth", "AdminAuth.jsx")}${node(c4, r[2], "Admin Panel", "DataManager.jsx")}
${node(c1, r[6], "Pre-render Script", "prerender.js")}${db(c3, r[6], "Supabase Postgres")}
<g transform="translate(${W - 236} ${H - 64})"><path d="M0 0h28" stroke="${t.text}" stroke-opacity=".85" stroke-width="1.5"/>${lab(38, 4, "data flow")}<path d="M0 24h28" stroke="${t.text}" stroke-opacity=".45" stroke-dasharray="2 5" stroke-linecap="round"/>${lab(38, 28, "fallback / read-only")}</g>
</svg>`;
}

// ---- header pills ----
function pill(label, t, filled) {
  const w = Math.round(label.length * 9.4 + 44), h = 40;
  return { w, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><defs>${grad("g", t)}</defs>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="20" fill="${filled ? "url(#g)" : "none"}" stroke="${filled ? "none" : t.border}"/>
<text x="${w / 2}" y="25.5" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="600" fill="${filled ? t.on : t.text}">${esc(label)}</text></svg>` };
}

// ---- project card: self-contained framed tile (the README lays them out in a 2-up grid) ----
// Signature: catalogue line "● ~/projects/<slug>" (● has a live site, ○ source only).
function card(c, t) {
  // Drawn at the size a half-width README cell renders (~400px), so 12-14px text stays 12-14px.
  const W = 420, H = 164, X = 20;
  const live = c.kind === "live";
  const mark = live
    ? `<circle cx="${X + 4}" cy="30" r="4" fill="${t.text}"/>`
    : `<circle cx="${X + 4}" cy="30" r="3.5" fill="none" stroke="${t.muted}"/>`;
  const desc = c.lines.map((l, k) => `<text x="${X}" y="${94 + k * 20}" font-family="${SANS}" font-size="14" fill="${t.muted}">${esc(l)}</text>`).join("");
  const word = live ? "LIVE ↗" : "SOURCE ↗", cw = Math.round(word.length * 7.2 + 20);
  const chip = `<rect x="${W - X - cw}" y="130" width="${cw}" height="22" rx="4" fill="${t.text}"/><text x="${W - X - cw / 2}" y="145" text-anchor="middle" font-family="${MONO}" font-size="11" font-weight="700" letter-spacing=".6" fill="${t.on}">${word}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}. ${esc(c.lines.join(" "))}">
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.card}" stroke="${t.border}"/>
${mark}<text x="${X + 16}" y="34" font-family="${MONO}" font-size="12" fill="${t.muted}">~/projects/${esc(c.slug)}</text>
<text x="${X}" y="66" font-family="${SANS}" font-size="20" font-weight="600" fill="${t.text}">${esc(c.title)}</text>
${desc}<text x="${X}" y="145" font-family="${MONO}" font-size="12" fill="${t.muted}">${esc(c.tags.join("  ·  "))}</text>
${chip}</svg>`;
}

// ---- buttons: one quiet outline style for every link ----
// Optional 16px brand/line icon on the left (same muted ink as the text roles allow, never its own colour).
function button(label, t, d, filled = false) {
  // Icon and label are one centred group; width tracks the label so every pill has the same inner padding.
  const PX = 16, IW = d ? 16 : 0, GAP = d ? 9 : 0, tw = Math.round(label.length * 7.7);
  const w = PX * 2 + IW + GAP + tw, h = 44, bh = 36;
  const ink = filled ? t.on : t.text;
  const icon = d ? glyph(d, PX, (bh - 16) / 2, 16, filled ? t.on : t.muted) : "";
  return { w, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<rect x=".5" y=".5" width="${w - 1}" height="${bh - 1}" rx="${bh / 2}" fill="${filled ? t.text : t.card}" stroke="${filled ? t.text : t.border}"/>${icon}
<text x="${PX + IW + GAP}" y="23" font-family="${SANS}" font-size="14" font-weight="500" fill="${ink}">${esc(label)}</text></svg>` };
}

// ---- section heading: title on the left, mono path on the right, hairline underneath ----
function heading(title, slug, t) {
  const W = 840, H = 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
<circle cx="5" cy="25" r="4" fill="${t.text}"/><text x="20" y="32" font-family="${SANS}" font-size="24" font-weight="600" letter-spacing="-.4" fill="${t.text}">${esc(title)}</text>
<text x="${W}" y="31" text-anchor="end" font-family="${MONO}" font-size="12" fill="${t.muted}">~/${slug}</text>
<rect y="${H - 2}" width="${W}" height="1" fill="${t.border}"/></svg>`;
}
const HEADINGS = [["selected", "Selected work", "selected-work"], ["github", "GitHub", "github"], ["how", "How advaita-website works", "architecture"], ["connect", "Let's connect", "connect"]];

// ---- badge: flat brand-coloured tile, uppercase label with icon (shields.io "for-the-badge" look) ----
function badge(label, d, bg) {
  const PX = 14, IW = 14, GAP = 8, up = label.toUpperCase(), tw = Math.round(up.length * 8.6);
  const w = PX * 2 + IW + GAP + tw, h = 44, bh = 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<rect x=".5" y=".5" width="${w - 1}" height="${bh - 1}" rx="4" fill="${bg}" stroke="#fff" stroke-opacity=".22"/>${glyph(d, PX, (bh - IW) / 2, IW, "#fff")}
<text x="${PX + IW + GAP}" y="20.5" font-family="${SANS}" font-size="12" font-weight="700" letter-spacing="1" fill="#fff">${esc(up)}</text></svg>`;
}

// ---- square stack tiles ----
function stackTiles(items, t) {
  const TW = 76, TH = 88, GAP = 10, W = items.length * TW + (items.length - 1) * GAP + 8;
  const tiles = items.map((it, i) => {
    const x = 4 + i * (TW + GAP);
    const icon = it.d ? glyph(it.d, x + TW / 2 - 16, 16, 32, t.text) : `<text x="${x + TW / 2}" y="40" text-anchor="middle" font-family="${SANS}" font-size="26" font-weight="800" fill="${t.text}">${esc(it.glyph)}</text>`;
    return `<rect x="${x + .5}" y="4.5" width="${TW - 1}" height="${TH - 1}" rx="3" fill="none" stroke="${t.border}"/>${icon}<text x="${x + TW / 2}" y="74" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${t.muted}">${esc(it.name)}</text>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TH + 8}" viewBox="0 0 ${W} ${TH + 8}" role="img" aria-label="Stack: ${esc(items.map((i) => i.name).join(", "))}">${tiles}</svg>`;
}

// ---- contact tiles ----
function contact(c, t) {
  const W = 580, H = 88;
  const icon = c.d ? glyph(c.d, 28, 28, 32, t.text) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.label)}: ${esc(c.value)}"><defs>${grad("g", t)}</defs>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="10" fill="none" stroke="${t.border}" stroke-width="1.5"/>
<rect x="1" y="1" width="88" height="${H - 2}" rx="9" fill="${t.text}" fill-opacity=".05"/><line x1="89" y1="1" x2="89" y2="${H - 1}" stroke="${t.border}"/>
${icon}<text x="112" y="36" font-family="${MONO}" font-size="12" letter-spacing="2" fill="${t.muted}">${esc(c.label.toUpperCase())}</text>
<text x="112" y="62" font-family="${SANS}" font-size="19" font-weight="700" fill="${t.text}">${esc(c.value)}</text>
<text x="${W - 26}" y="52" text-anchor="end" font-family="${SANS}" font-size="22" fill="${t.muted}">↗</text></svg>`;
}

function divider(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="12" viewBox="0 0 1200 12" role="presentation"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${t.a}" stop-opacity="0"/><stop offset=".5" stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}" stop-opacity="0"/></linearGradient></defs><rect y="5" width="1200" height="2" rx="1" fill="url(#g)"/></svg>`;
}

// ---- content ----
const GH = (r) => `https://github.com/${OWNER}/${r}`;
const CARDS = [
  { id: "aperture", slug: "aperture", title: "Aperture", kind: "live", lines: ["Paste a link, keep the post: saves reels,", "photos and carousels. No ads, no accounts."], tags: ["React", "Node.js", "yt-dlp"], live: "https://aperture.advaitachandra.in/", repo: GH("aperture") },
  { id: "osho", slug: "osho-documentary", title: "Osho Documentary", kind: "live", lines: ["Evidence-graded archive on Osho and", "Rajneeshpuram with timeline and map."], tags: ["Next.js", "TypeScript"], live: "https://oshodocumentary.advaitachandra.in/", repo: GH("osho-documentary") },
  { id: "declutter", slug: "declutter", title: "Declutter", kind: "live", lines: ["Sorts a messy folder, finds duplicates.", "Previews first, never permanently deletes."], tags: ["Python", "Windows"], live: "https://declutter.advaitachandra.in/", repo: GH("declutter") },
  { id: "site", slug: "advaita-website", title: "advaitachandra.in", kind: "live", lines: ["Personal site and public notebook:", "projects, reading notes, photography."], tags: ["React", "Vite", "Supabase"], live: "https://www.advaitachandra.in/", repo: GH("advaita-website") },
  { id: "support", slug: "supportadvaita", title: "Support page", kind: "live", lines: ["Zero-fee UPI page to support independent", "software, research and photography."], tags: ["JavaScript", "UPI"], live: "https://support.advaitachandra.in/", repo: GH("supportadvaita") },
  { id: "w1tos", slug: "w1tos-ui", title: "w1tOS", kind: "repo", lines: ["Dark, keyboard-first web UI for", "CasaOS home servers."], tags: ["Vue", "CasaOS"], repo: GH("w1tos-ui") },
  { id: "deck", slug: "command-deck", title: "Command Deck", kind: "repo", lines: ["Exam and syllabus study dashboard on", "Cloudflare Workers + D1."], tags: ["TypeScript", "Cloudflare"], repo: GH("command-deck") },
];
const PILLS = [["website", "Website", false, "https://www.advaitachandra.in"], ["x", "X · @w1tneess_", false, "https://x.com/w1tneess_"], ["email", "Email", false, "mailto:hi@advaitachandra.in"], ["support", "Support my work", true, "https://support.advaitachandra.in/"]];
const STACK = [["TypeScript", "typescript"], ["JavaScript", "javascript"], ["React", "react"], ["Next.js", "nextdotjs"], ["Vite", "vite"], ["Tailwind", "tailwindcss"], ["Node.js", "nodedotjs"], ["Python", "python"], ["C#", "csharp", "C#"], ["HTML", "html5"], ["CSS", "css3"], ["Supabase", "supabase"], ["Cloudflare", "cloudflare"], ["Git", "git"]];
const stack = await Promise.all(STACK.map(async ([name, slug, glyphText]) => ({ name, d: await iconPath(slug), glyph: glyphText ?? name[0] })));
const CONTACTS = [
  { id: "email", label: "Email", value: "hi@advaitachandra.in", href: "mailto:hi@advaitachandra.in", d: await iconPath("gmail") },
  { id: "x", label: "X / Twitter", value: "@w1tneess_", href: "https://x.com/w1tneess_", d: await iconPath("x") },
  { id: "github", label: "GitHub", value: "w1tneess", href: `https://github.com/${OWNER}`, d: await iconPath("github") },
  { id: "web", label: "Website", value: "advaitachandra.in", href: "https://www.advaitachandra.in/", d: GLOBE },
];

// Contact buttons used in the README header and "Let's connect"
const SOCIALS = [
  ["website", "advaitachandra.in", GLOBE, "#2563EB"],
  ["x", "@w1tneess_", await iconPath("x"), "#000000"],
  ["instagram", "@adva1ta_", await iconPath("instagram"), "#E4405F"],
  ["email", "hi@advaitachandra.in", await iconPath("gmail"), "#EA4335"],
  ["support", "Support", await iconPath("githubsponsors"), "#DB61A2"],
];

// ---- write assets (clean old generated files first) ----
mkdirSync("assets", { recursive: true });
for (const f of readdirSync("assets")) if (f.endsWith(".svg")) unlinkSync(`assets/${f}`);
const put = (name, svg) => writeFileSync(`assets/${name}.svg`, svg);
for (const [mode, t] of Object.entries(THEMES)) {
  put(`hero-${mode}`, hero(t));
  put(`arch-${mode}`, arch(t));
  put(`stack-${mode}`, stackTiles(stack, t));
  put(`divider-${mode}`, divider(t));
  for (const c of CARDS) put(`card-${c.id}-${mode}`, card(c, t));
  put(`btn-live-${mode}`, button("Live site ↗", t).svg);
  put(`btn-source-${mode}`, button("Source ↗", t).svg);
  for (const [id, title, slug] of HEADINGS) put(`heading-${id}-${mode}`, heading(title, slug, t));
  for (const [id, label, d, bg] of SOCIALS) put(`btn-${id}-${mode}`, badge(label, d, bg));
  for (const [id, label, filled] of PILLS) put(`pill-${id}-${mode}`, pill(label, t, filled).svg);
  for (const c of CONTACTS) put(`contact-${c.id}-${mode}`, contact(c, t));
}

// ---- README (<picture> + prefers-color-scheme; GitHub maps it to the viewer theme) ----
const themed = (base, attrs, alt) => `<picture><source media="(prefers-color-scheme: dark)" srcset="${base("dark")}"><img src="${base("light")}" ${attrs} alt="${alt}"></picture>`;
const local = (name) => (m) => `assets/${name}-${m}.svg`;
const remote = (name) => (m) => `${RAW}/stats-output/${name}-${m}.svg`;
const link = (href, inner) => `<a href="${href}">${inner}</a>`;
const cardCell = (c) => {
  const btns = [c.live && link(c.live, themed(local("btn-live"), 'height="44"', "Live site")), link(c.repo, themed(local("btn-source"), 'height="44"', "Source code"))].filter(Boolean).join("&nbsp;&nbsp;");
  return `<td width="50%" valign="top">${link(c.live ?? c.repo, themed(local(`card-${c.id}`), 'width="100%"', esc(c.title)))}<br>${btns}<br><br></td>`;
};
const rows = Array.from({ length: Math.ceil(CARDS.length / 2) }, (_, r) => CARDS.slice(r * 2, r * 2 + 2))
  .map((pair) => `<tr>\n${pair.map(cardCell).join("\n")}${pair.length < 2 ? '\n<td width="50%"></td>' : ""}\n</tr>`)
  .join("\n");
const contactCell = (c) => `<td width="50%">${link(c.href, themed(local(`contact-${c.id}`), 'width="100%"', `${c.label}: ${c.value}`))}</td>`;
const pills = PILLS.map(([id, label, , href]) => link(href, themed(local(`pill-${id}`), 'height="40"', label))).join("\n");

if (process.argv.includes("--readme")) writeFileSync("README.md", `<div align="center">

${themed(local("hero"), 'width="100%"', "Advaita Chandra, w1tneess. Student, builder, explorer.")}

<br>

${pills}

</div>

${themed(local("divider"), 'width="100%"', "")}

## About

Student and developer from India, somewhere between software, philosophy and history. I build websites, useful little tools and interactive archives, and keep a public notebook of what I am reading.

## Stack

${themed(local("stack"), 'width="100%"', "Stack: " + STACK.map((s) => s[0]).join(", "))}

## Selected work

<table width="100%">
${rows}
</table>

## GitHub

<table width="100%">
<tr>
<td width="50%" valign="top">${themed(remote("stats"), 'width="100%"', "GitHub stats")}</td>
<td width="50%" valign="top">${themed(remote("languages"), 'width="100%"', "Top languages")}</td>
</tr>
</table>

<img src="${RAW}/snake-output/snake-dark.svg#gh-dark-mode-only" width="100%" alt="Contribution snake"><img src="${RAW}/snake-output/snake.svg#gh-light-mode-only" width="100%" alt="Contribution snake">

## Contact

<table width="100%">
<tr>
${contactCell(CONTACTS[0])}
${contactCell(CONTACTS[1])}
</tr>
<tr>
${contactCell(CONTACTS[2])}
${contactCell(CONTACTS[3])}
</tr>
</table>

<div align="center">

${link("https://support.advaitachandra.in/", themed(local("pill-support"), 'height="40"', "Support my work"))}

<sub>Questions welcome. Ideas better.</sub>

</div>
`);
console.log("assets + README written");
