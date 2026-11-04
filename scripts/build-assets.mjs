// Generates the README artwork (light + dark) into assets/ and writes README.md.
// Run: node scripts/build-assets.mjs   (needs network once, for brand icon paths)
import { mkdirSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";

const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const SERIF = "Georgia,'Times New Roman',serif";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const OWNER = "w1tneess";
const RAW = `https://raw.githubusercontent.com/${OWNER}/${OWNER}`;

// "Cyberminimalism" palette: #000000 #0A0A0A #141414 #383838 #F0F0F0
const THEMES = {
  dark: { text: "#f0f0f0", muted: "#8f8f8f", border: "#383838", a: "#f0f0f0", b: "#8f8f8f", on: "#0a0a0a", dot: "#ffffff0f", glow: 0.1 },
  light: { text: "#0a0a0a", muted: "#5c5c5c", border: "#c9c9c9", a: "#0a0a0a", b: "#5c5c5c", on: "#f0f0f0", dot: "#0000000f", glow: 0.08 },
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

// ---- hero ----
function hero(t) {
  const W = 1200, H = 320;
  const lines = ["Building small things.", "Keeping the questions open.", "Web apps · Windows tools · archives"];
  const tag = lines.map((l, i) => `<text class="tag" style="animation-delay:${i * 3}s" x="64" y="236" font-family="${SERIF}" font-style="italic" letter-spacing="1" font-size="24" fill="${t.text}">${esc(l)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Advaita Chandra, w1tneess</title><desc id="d">Student, builder, explorer. Building small things. Keeping the questions open.</desc>
<defs>${grad("g", t)}
<radialGradient id="r1"><stop offset="0" stop-color="${t.a}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${t.a}" stop-opacity="0"/></radialGradient>
<radialGradient id="r2"><stop offset="0" stop-color="${t.b}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${t.b}" stop-opacity="0"/></radialGradient>
<pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="${t.dot}"/></pattern>
<clipPath id="c"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs>
<style>.tag{opacity:0;animation:cy 9s infinite}@keyframes cy{0%{opacity:0}6%,28%{opacity:1}34%,100%{opacity:0}}.cur{animation:bl 1s steps(1) infinite}@keyframes bl{50%{opacity:0}}@media (prefers-reduced-motion:reduce){.tag,.cur{animation:none}.tag:first-of-type{opacity:1}}</style>
<g clip-path="url(#c)"><rect width="${W}" height="${H}" fill="url(#dots)"/>
<circle cx="1040" cy="40" r="260" fill="url(#r1)"/><circle cx="180" cy="330" r="240" fill="url(#r2)"/></g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="24" fill="none" stroke="${t.border}"/>
<text x="64" y="70" font-family="${MONO}" font-size="16" fill="${t.muted}"><tspan fill="url(#g)">●</tspan>  ~/w1tneess</text>
<text x="64" y="150" font-family="${SANS}" font-size="68" font-weight="800" letter-spacing="-1.5" fill="url(#g)">Advaita Chandra</text>
<text x="64" y="192" font-family="${SANS}" font-size="15" font-weight="600" letter-spacing="5" fill="${t.muted}">W1TNEESS  ·  STUDENT  ·  BUILDER  ·  EXPLORER</text>
${tag}<rect class="cur" x="64" y="268" width="12" height="3" fill="${t.b}"/>
<text x="${W - 64}" y="${H - 36}" text-anchor="end" font-family="${MONO}" font-size="15" fill="${t.muted}">West Bengal, India</text>
</svg>`;
}

// ---- header pills ----
function pill(label, t, filled) {
  const w = Math.round(label.length * 9.4 + 44), h = 40;
  return { w, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><defs>${grad("g", t)}</defs>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="20" fill="${filled ? "url(#g)" : "none"}" stroke="${filled ? "none" : t.border}"/>
<text x="${w / 2}" y="25.5" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="600" fill="${filled ? t.on : t.text}">${esc(label)}</text></svg>` };
}

// ---- project card: boxy "window" panel ----
function card(c, i, t) {
  const W = 580, H = 206;
  let x = 28;
  const chips = c.tags.map((tag) => {
    const w = Math.round(tag.length * 7.4 + 24);
    const s = `<rect x="${x + .5}" y="156.5" width="${w}" height="26" rx="4" fill="none" stroke="${t.border}"/><text x="${x + w / 2 + .5}" y="173.5" text-anchor="middle" font-family="${MONO}" font-size="12.5" fill="${t.muted}">${esc(tag)}</text>`;
    x += w + 8;
    return s;
  }).join("");
  const desc = c.lines.map((l, k) => `<text x="28" y="${112 + k * 22}" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(l)}</text>`).join("");
  const kw = c.kind.length * 8 + 18;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}. ${esc(c.lines.join(" "))}">
<defs>${grad("g", t)}<clipPath id="c"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="9"/></clipPath></defs>
<g clip-path="url(#c)"><rect x="1" y="1" width="${W - 2}" height="38" fill="${t.text}" fill-opacity=".05"/><rect x="1" y="1" width="3" height="${H - 2}" fill="url(#g)"/></g>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="10" fill="none" stroke="${t.border}" stroke-width="1.5"/>
<line x1="1" y1="39" x2="${W - 1}" y2="39" stroke="${t.border}"/>
<circle cx="24" cy="20" r="4.5" fill="${t.muted}" fill-opacity=".55"/><circle cx="41" cy="20" r="4.5" fill="${t.muted}" fill-opacity=".35"/><circle cx="58" cy="20" r="4.5" fill="${t.muted}" fill-opacity=".2"/>
<text x="80" y="24.5" font-family="${MONO}" font-size="12" fill="${t.muted}">~/projects/${esc(c.slug)}</text>
<text x="${W - 22}" y="24.5" text-anchor="end" font-family="${MONO}" font-size="12" fill="${t.muted}">${String(i + 1).padStart(2, "0")}</text>
<text x="28" y="76" font-family="${SANS}" font-size="23" font-weight="700" fill="${t.text}">${esc(c.title)}</text>
<rect x="${W - 28 - kw + .5}" y="58.5" width="${kw}" height="22" rx="4" fill="none" stroke="${t.a}" stroke-opacity=".6"/><text x="${W - 28 - kw / 2 + .5}" y="73.5" text-anchor="middle" font-family="${MONO}" font-size="11" letter-spacing="1.5" fill="${t.text}">${esc(c.kind.toUpperCase())}</text>
${desc}${chips}</svg>`;
}

// ---- real buttons ----
function button(label, t, primary) {
  const w = Math.round(label.length * 8.6 + 42), h = 40;
  return { w, svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="8" fill="${primary ? t.text : "none"}" stroke="${primary ? t.text : t.border}"/>
<text x="${w / 2}" y="25.5" text-anchor="middle" font-family="${SANS}" font-size="14.5" font-weight="600" fill="${primary ? t.on : t.text}">${esc(label)}</text></svg>` };
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

// ---- write assets (clean old generated files first) ----
mkdirSync("assets", { recursive: true });
for (const f of readdirSync("assets")) if (f.endsWith(".svg")) unlinkSync(`assets/${f}`);
const put = (name, svg) => writeFileSync(`assets/${name}.svg`, svg);
for (const [mode, t] of Object.entries(THEMES)) {
  put(`hero-${mode}`, hero(t));
  put(`stack-${mode}`, stackTiles(stack, t));
  put(`divider-${mode}`, divider(t));
  CARDS.forEach((c, i) => {
    put(`card-${c.id}-${mode}`, card(c, i, t));
    if (c.live) put(`btn-live-${mode}`, button("Live site ↗", t, true).svg);
    put(`btn-source-${mode}`, button("Source ↗", t, false).svg);
    put(`btn-source-primary-${mode}`, button("Source ↗", t, true).svg);
  });
  for (const [id, label, filled] of PILLS) put(`pill-${id}-${mode}`, pill(label, t, filled).svg);
  for (const c of CONTACTS) put(`contact-${c.id}-${mode}`, contact(c, t));
}

// ---- README (gh-dark/light-mode-only follows GitHub's own theme setting) ----
const themed = (base, attrs, alt) => `<img src="${base("dark")}#gh-dark-mode-only" ${attrs} alt="${alt}"><img src="${base("light")}#gh-light-mode-only" ${attrs} alt="${alt}">`;
const local = (name) => (m) => `assets/${name}-${m}.svg`;
const remote = (name) => (m) => `${RAW}/stats-output/${name}-${m}.svg`;
const link = (href, inner) => `<a href="${href}">${inner}</a>`;
const cardCell = (c) => {
  const btns = [c.live && link(c.live, themed(local("btn-live"), 'height="40"', "Live site")), link(c.repo, themed(local(c.live ? "btn-source" : "btn-source-primary"), 'height="40"', "Source code"))].filter(Boolean).join("&nbsp;&nbsp;");
  return `<td width="50%" valign="top">${link(c.live ?? c.repo, themed(local(`card-${c.id}`), 'width="100%"', esc(c.title)))}<br>${btns}<br><br></td>`;
};
const rows = [0, 2, 4].map((i) => `<tr>\n${cardCell(CARDS[i])}\n${cardCell(CARDS[i + 1])}\n</tr>`).join("\n");
const contactCell = (c) => `<td width="50%">${link(c.href, themed(local(`contact-${c.id}`), 'width="100%"', `${c.label}: ${c.value}`))}</td>`;
const pills = PILLS.map(([id, label, , href]) => link(href, themed(local(`pill-${id}`), 'height="40"', label))).join("\n");

writeFileSync("README.md", `<div align="center">

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
