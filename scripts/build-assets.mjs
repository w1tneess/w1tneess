// Generates the self-hosted README artwork (light + dark) into assets/. Run: node scripts/build-assets.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const THEMES = {
  // "Cyberminimalism" palette: #000000 #0A0A0A #141414 #383838 #F0F0F0
  dark: { bg1: "#0a0a0a", bg2: "#141414", border: "#383838", text: "#f0f0f0", muted: "#8f8f8f", chip: "#141414", a: "#f0f0f0", b: "#8f8f8f", on: "#0a0a0a", dot: "#ffffff0f", glow: 0.1 },
  light: { bg1: "#f0f0f0", bg2: "#ffffff", border: "#c9c9c9", text: "#0a0a0a", muted: "#5c5c5c", chip: "#e4e4e4", a: "#0a0a0a", b: "#5c5c5c", on: "#f0f0f0", dot: "#0000000f", glow: 0.08 },
};

const grad = (id, t) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}"/></linearGradient>`;

function hero(t) {
  const W = 1200, H = 320;
  const lines = ["Building small things.", "Keeping the questions open.", "Web apps · Windows tools · archives"];
  const tag = lines
    .map((l, i) => `<text class="tag" style="animation-delay:${i * 3}s" x="64" y="236" font-family="Georgia,'Times New Roman',serif" font-style="italic" letter-spacing="1" font-size="24" fill="${t.text}">${esc(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">Advaita Chandra, w1tneess</title><desc id="d">Student, builder, explorer. Building small things. Keeping the questions open.</desc>
<defs>${grad("g", t)}
<radialGradient id="r1"><stop offset="0" stop-color="${t.a}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${t.a}" stop-opacity="0"/></radialGradient>
<radialGradient id="r2"><stop offset="0" stop-color="${t.b}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${t.b}" stop-opacity="0"/></radialGradient>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
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

function pill(label, t, filled) {
  const w = Math.round(label.length * 9.4 + 44), h = 40;
  const fill = filled ? "url(#g)" : "none";
  const col = filled ? t.on : t.text;
  return {
    w,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><defs>${grad("g", t)}</defs>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="20" fill="${fill}" stroke="${filled ? "none" : t.border}"/>
<text x="${w / 2}" y="25.5" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="600" fill="${col}">${esc(label)}</text></svg>`,
  };
}

function card(c, t) {
  const W = 580, H = 190;
  let x = 28;
  const chips = c.tags
    .map((tag) => {
      const w = Math.round(tag.length * 7.4 + 22);
      const s = `<rect x="${x}" y="140" width="${w}" height="26" rx="13" fill="${t.text}" fill-opacity=".07"/><text x="${x + w / 2}" y="157.5" text-anchor="middle" font-family="${MONO}" font-size="12.5" fill="${t.muted}">${esc(tag)}</text>`;
      x += w + 8;
      return s;
    })
    .join("");
  const desc = c.lines.map((l, i) => `<text x="28" y="${86 + i * 22}" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(l)}</text>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title)}. ${esc(c.lines.join(" "))}">
<defs>${grad("g", t)}<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient></defs>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="${t.border}"/>
<rect x="28" y="26" width="36" height="4" rx="2" fill="url(#g)"/>
<text x="28" y="62" font-family="${SANS}" font-size="22" font-weight="700" fill="${t.text}">${esc(c.title)}</text>
<text x="${W - 28}" y="62" text-anchor="end" font-family="${MONO}" font-size="13" fill="${t.a}">${esc(c.kind)} ↗</text>
${desc}${chips}</svg>`;
}

function stack(items, t) {
  const W = 1200, PAD = 4;
  let x = PAD, y = PAD, out = "";
  for (const it of items) {
    const w = Math.round(it.length * 9.2 + 34);
    if (x + w > W - PAD) { x = PAD; y += 46; }
    out += `<rect x="${x}" y="${y}" width="${w}" height="36" rx="18" fill="${t.chip}" stroke="${t.border}"/><circle cx="${x + 16}" cy="${y + 18}" r="4" fill="url(#g)"/><text x="${x + 28}" y="${y + 23.5}" font-family="${SANS}" font-size="14.5" font-weight="500" fill="${t.text}">${esc(it)}</text>`;
    x += w + 10;
  }
  const H = y + 40;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack: ${esc(items.join(", "))}"><defs>${grad("g", t)}</defs>${out}</svg>`;
}

function divider(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="12" viewBox="0 0 1200 12" role="presentation"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${t.a}" stop-opacity="0"/><stop offset=".5" stop-color="${t.a}"/><stop offset="1" stop-color="${t.b}" stop-opacity="0"/></linearGradient></defs><rect y="5" width="1200" height="2" rx="1" fill="url(#g)"/></svg>`;
}

export const CARDS = [
  { id: "osho", title: "Osho Documentary", kind: "live", lines: ["Evidence-graded archive on Osho and", "Rajneeshpuram with timeline and map."], tags: ["Next.js", "TypeScript"] },
  { id: "declutter", title: "Declutter", kind: "live", lines: ["Sorts a messy folder, finds duplicates.", "Previews first, never permanently deletes."], tags: ["Python", "Windows"] },
  { id: "site", title: "advaitachandra.in", kind: "live", lines: ["Personal site and public notebook:", "projects, reading notes, photography."], tags: ["React", "Vite", "Supabase"] },
  { id: "support", title: "Support page", kind: "live", lines: ["Zero-fee UPI page to support independent", "software, research and photography."], tags: ["JavaScript", "UPI"] },
  { id: "w1tos", title: "w1tOS", kind: "repo", lines: ["Dark, keyboard-first web UI for", "CasaOS home servers."], tags: ["Vue", "CasaOS"] },
  { id: "deck", title: "Command Deck", kind: "repo", lines: ["Exam and syllabus study dashboard on", "Cloudflare Workers + D1."], tags: ["TypeScript", "Cloudflare"] },
];
const PILLS = [["website", "Website", false], ["x", "X · @w1tneess_", false], ["email", "Email", false], ["support", "Support my work", true]];
const STACK = ["TypeScript", "JavaScript", "React", "Next.js", "Vite", "Tailwind CSS", "Node.js", "Python", "C#", "HTML", "CSS", "Supabase", "Cloudflare", "Git"];

mkdirSync("assets", { recursive: true });
const put = (name, svg) => writeFileSync(`assets/${name}.svg`, svg);
for (const [mode, t] of Object.entries(THEMES)) {
  put(`hero-${mode}`, hero(t));
  put(`divider-${mode}`, divider(t));
  for (const c of CARDS) put(`card-${c.id}-${mode}`, card(c, t));
  for (const [id, label, filled] of PILLS) put(`pill-${id}-${mode}`, pill(label, t, filled).svg);
}
console.log("assets written");
