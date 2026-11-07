// Builds the activity city, GitHub stats and top-languages cards (light/dark) from public API data.
// Run: GITHUB_TOKEN=... node scripts/build-stats.mjs <outDir> [username]
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv[2] || "out";
const USER = process.argv[3] || process.env.GITHUB_REPOSITORY_OWNER || "w1tneess";
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";
// Dark and light panels matching the README hero and skyline (#0a0a0a / #fafafa, hairline border).
const THEMES = {
  dark: { text: "#f0f0f0", muted: "#8f8f8f", border: "#f0f0f01a", bg: "#0a0a0a" },
  light: { text: "#0a0a0a", muted: "#5c5c5c", border: "#0a0a0a1a", bg: "#fafafa" },
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const W = 580, H = 220;

const headers = { Accept: "application/vnd.github+json", "User-Agent": "profile-stats", ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }) };
const api = async (path) => {
  const r = await fetch(`https://api.github.com${path}`, { headers });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
};
const count = async (q) => (await api(`/search/${q.kind}?q=${encodeURIComponent(q.q)}&per_page=1`)).total_count;

async function collect() {
  const user = await api(`/users/${USER}`);
  const repos = (await api(`/users/${USER}/repos?type=owner&per_page=100`)).filter((r) => !r.fork);
  const langs = {};
  for (const r of repos) for (const [l, n] of Object.entries(await api(`/repos/${USER}/${r.name}/languages`))) langs[l] = (langs[l] || 0) + n;
  const [commits, prs, issues] = await Promise.all([
    count({ kind: "commits", q: `author:${USER}` }),
    count({ kind: "issues", q: `author:${USER} type:pr` }),
    count({ kind: "issues", q: `author:${USER} type:issue` }),
  ]);
  // Contribution calendar needs GraphQL (any token works for public data).
  const gql = await fetch("https://api.github.com/graphql", {
    method: "POST", headers,
    body: JSON.stringify({ query: `query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`, variables: { l: USER } }),
  }).then((r) => r.json());
  const cal = gql.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error(`GraphQL calendar: ${JSON.stringify(gql.errors ?? gql)}`);
  return {
    calendar: { total: cal.totalContributions, weeks: cal.weeks.map((w) => w.contributionDays.map((d) => ({ date: d.date, n: d.contributionCount }))) },
    metrics: [
      ["Repositories", user.public_repos], ["Stars earned", repos.reduce((s, r) => s + r.stargazers_count, 0)], ["Followers", user.followers],
      ["Commits", commits], ["Pull requests", prs], ["Issues", issues],
    ],
    langs: Object.entries(langs).sort((a, b) => b[1] - a[1]),
  };
}

const MOTION = `<style>.m{animation:up .6s cubic-bezier(.22,1,.36,1) both}@keyframes up{from{opacity:0;transform:translateY(8px)}}.grow{animation:gr 1.1s cubic-bezier(.22,1,.36,1) both}@keyframes gr{from{transform:scaleX(0)}}@media (prefers-reduced-motion:reduce){.m,.grow{animation:none}}</style>`;
const frame = (t, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${MOTION}
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.bg}" stroke="${t.border}"/>
<text x="28" y="56" font-family="${SANS}" font-size="20" font-weight="500" fill="${t.text}">${esc(title)}</text>${body}</svg>`;

function statsCard(t, { metrics }) {
  const body = metrics.map(([label, v], i) => {
    const x = 28 + (i % 3) * 180, y = 112 + Math.floor(i / 3) * 62;
    return `<g class="m" style="animation-delay:${i * 60}ms"><text x="${x}" y="${y}" font-family="${SANS}" font-size="28" font-weight="500" style="font-variant-numeric:tabular-nums" fill="${t.text}">${Number(v).toLocaleString("en-US")}</text><text x="${x}" y="${y + 20}" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(label)}</text></g>`;
  }).join("");
  return frame(t, "GitHub stats", `<text x="${W - 28}" y="56" text-anchor="end" font-family="${MONO}" font-size="14" fill="${t.muted}">public</text>${body}`);
}

function langsCard(t, { langs }) {
  const top = langs.slice(0, 5), total = langs.reduce((s, [, n]) => s + n, 0) || 1;
  const opac = [1, 0.72, 0.52, 0.36, 0.24];
  let x = 28, bar = "";
  top.forEach(([, n], i) => {
    const w = Math.max(4, (n / total) * (W - 56));
    bar += `<rect x="${x.toFixed(1)}" y="84" width="${w.toFixed(1)}" height="10" fill="${t.text}" fill-opacity="${opac[i]}"/>`;
    x += w;
  });
  const legend = top.map(([l, n], i) => {
    const cx = 28 + (i % 2) * 260, cy = 130 + Math.floor(i / 2) * 30;
    return `<g class="m" style="animation-delay:${300 + i * 60}ms"><rect x="${cx}" y="${cy - 10}" width="10" height="10" rx="2" fill="${t.text}" fill-opacity="${opac[i]}"/><text x="${cx + 18}" y="${cy}" font-family="${SANS}" font-size="16" fill="${t.text}">${esc(l)}</text><text x="${cx + 230}" y="${cy}" text-anchor="end" font-family="${MONO}" font-size="14" fill="${t.muted}">${((n / total) * 100).toFixed(1)}%</text></g>`;
  }).join("");
  return frame(t, "Top languages", `<clipPath id="c"><rect x="28" y="84" width="${W - 56}" height="10" rx="5"/></clipPath><g clip-path="url(#c)"><g class="grow" style="transform-origin:28px 89px">${bar}</g></g>${legend}`);
}

// ---- activity: isometric city of contribution days, with streaks beside it ----
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (iso) => new Date(`${iso}T00:00:00Z`);
const fmt = (iso) => `${MONTHS[day(iso).getUTCMonth()]} ${day(iso).getUTCDate()}`;
const f1 = (n) => n.toFixed(1);
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, k) => `#${hex(a).map((x, i) => Math.round(x + (hex(b)[i] - x) * k).toString(16).padStart(2, "0")).join("")}`;

function streaks(days) {
  let longest = 0, run = 0;
  for (const d of days) { run = d.n > 0 ? run + 1 : 0; longest = Math.max(longest, run); }
  let i = days.length - 1;
  if (i >= 0 && days[i].n === 0) i--; // today may simply not have commits yet
  let current = 0;
  while (i >= 0 && days[i].n > 0) { current++; i--; }
  return { longest, current };
}
{ const s = streaks([1, 1, 0, 1, 1, 1, 0].map((n) => ({ n }))); if (s.longest !== 3 || s.current !== 3) throw new Error("streaks self-check failed"); }

function activityCard(t, { calendar }) {
  const W2 = 1200, H2 = 460, TOP = 40, BOTTOM = H2 - 56;
  const all = calendar.weeks;
  // Start a little before the first active week so the city isn't a long empty strip (at least 16 weeks shown).
  const first = Math.max(0, all.findIndex((w) => w.some((d) => d.n > 0)));
  const weeks = all.slice(Math.max(0, Math.min(first - 2, all.length - 16)));
  const days = weeks.flat(), N = weeks.length, max = Math.max(1, ...days.map((d) => d.n));
  const s = Math.min(26, 700 / ((N + 7) * 0.866), (BOTTOM - TOP - 90) / ((N + 7) * 0.5));
  const a = s * 0.866, b = s * 0.5;
  let maxH = 150;
  const lvl = (n) => Math.sqrt(n / max);
  const ht = (n) => (n > 0 ? 8 + (maxH - 8) * lvl(n) : 0);
  // Fit: lowest floor point on BOTTOM, tallest bar top no higher than TOP (shrink bars if needed).
  const cells = weeks.flatMap((w, u) => w.map((d, v) => ({ ...d, u, v })));
  const rise = (c) => (c.u + c.v) * b - ht(c.n); // relative top y
  const floorH = (N + 7) * b;
  while (floorH - Math.min(0, ...cells.map(rise)) > BOTTOM - TOP && maxH > 24) maxH *= 0.92;
  const ox = W2 - 56 - N * a, oy = BOTTOM - floorH;
  const P = (u, v, z = 0) => `${f1(ox + (u - v) * a)},${f1(oy + (u + v) * b - z)}`;
  const quad = (pts, fill, extra = "") => `<polygon points="${pts.join(" ")}" fill="${fill}"${extra}/>`;

  const floor = cells.map(({ u, v }) => quad([P(u, v), P(u + 1, v), P(u + 1, v + 1), P(u, v + 1)], mix(t.bg, t.text, 0.05), ` stroke="${mix(t.bg, t.text, 0.16)}" stroke-width=".8"`)).join("");
  const blocks = cells.filter((c) => c.n > 0).sort((p, q) => p.u + p.v - (q.u + q.v) || p.u - q.u).map(({ u, v, n }) => {
    const h = ht(n), k = 0.3 + 0.7 * lvl(n);
    const [bx, by] = P(u + 0.5, v + 0.5).split(",");
    const edge = ` stroke="${t.bg}" stroke-width=".6" stroke-linejoin="round"`;
    return `<g class="b" style="transform-origin:${bx}px ${by}px;animation-delay:${Math.round(u * 28 + v * 10)}ms">`
      + quad([P(u, v + 1), P(u + 1, v + 1), P(u + 1, v + 1, h), P(u, v + 1, h)], mix(t.bg, t.text, k * 0.62), edge)
      + quad([P(u + 1, v), P(u + 1, v + 1), P(u + 1, v + 1, h), P(u + 1, v, h)], mix(t.bg, t.text, k * 0.38), edge)
      + quad([P(u, v, h), P(u + 1, v, h), P(u + 1, v + 1, h), P(u, v + 1, h)], mix(t.bg, t.text, k), edge) + "</g>";
  }).join("");
  const months = weeks.map((w, u) => (u > 0 && day(w[0].date).getUTCMonth() !== day(weeks[u - 1][0].date).getUTCMonth())
    ? `<text x="${P(u + 0.5, 7.9).split(",")[0]}" y="${f1(+P(u + 0.5, 7.9).split(",")[1] + 10)}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${t.muted}">${MONTHS[day(w[0].date).getUTCMonth()]}</text>` : "").join("");

  const { current, longest } = streaks(all.flat());
  const best = all.flat().reduce((p, q) => (q.n > p.n ? q : p), { n: 0, date: days[0].date });
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const rows = [["current streak", plural(current, "day")], ["longest streak", plural(longest, "day")], ["busiest day", `${best.n} on ${fmt(best.date)}`]]
    .map(([l, v], i) => `<g class="m" style="animation-delay:${300 + i * 80}ms"><text x="56" y="${288 + i * 40}" font-family="${MONO}" font-size="14" fill="${t.muted}">${l}</text><text x="392" y="${288 + i * 40}" text-anchor="end" font-family="${SANS}" font-size="18" font-weight="500" style="font-variant-numeric:tabular-nums" fill="${t.text}">${esc(v)}</text></g>`).join("");
  const legend = [0, 0.25, 0.5, 0.75, 1].map((k, i) => `<rect x="${100 + i * 18}" y="${H2 - 58}" width="12" height="12" rx="2" fill="${k ? mix(t.bg, t.text, 0.3 + 0.7 * k) : mix(t.bg, t.text, 0.08)}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="0 0 ${W2} ${H2}" role="img" aria-label="${calendar.total} contributions in the last year, drawn as a 3D city of days. Current streak ${plural(current, "day")}, longest ${plural(longest, "day")}.">
<style>.b{animation:rise .9s cubic-bezier(.22,1,.36,1) both}@keyframes rise{from{transform:scaleY(0)}}.m{animation:up .6s cubic-bezier(.22,1,.36,1) both}@keyframes up{from{opacity:0;transform:translateY(8px)}}@media (prefers-reduced-motion:reduce){.b,.m{animation:none}}</style>
<rect x=".5" y=".5" width="${W2 - 1}" height="${H2 - 1}" rx="16" fill="${t.bg}" stroke="${t.border}"/>
${floor}${blocks}${months}
<circle cx="61" cy="67" r="4" fill="${t.text}"/><text x="74" y="72" font-family="${MONO}" font-size="15" fill="${t.muted}">~/activity</text>
<text x="52" y="168" font-family="${SANS}" font-size="76" font-weight="500" letter-spacing="-2" style="font-variant-numeric:tabular-nums" fill="${t.text}">${calendar.total.toLocaleString("en-US")}</text>
<text x="56" y="204" font-family="${SANS}" font-size="18" fill="${t.muted}">contributions in the last year</text>
<line x1="56" x2="392" y1="240" y2="240" stroke="${t.border}"/>${rows}
<text x="56" y="${H2 - 48}" font-family="${MONO}" font-size="12" fill="${t.muted}">less</text>${legend}<text x="196" y="${H2 - 48}" font-family="${MONO}" font-size="12" fill="${t.muted}">more</text>
<text x="${W2 - 56}" y="${H2 - 24}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${t.muted}">${fmt(days[0].date)} – ${fmt(days[days.length - 1].date)}, ${day(days[days.length - 1].date).getUTCFullYear()}</text>
</svg>`;
}

const data = await collect();
mkdirSync(OUT, { recursive: true });
for (const [mode, t] of Object.entries(THEMES)) {
  writeFileSync(`${OUT}/stats-${mode}.svg`, statsCard(t, data));
  writeFileSync(`${OUT}/languages-${mode}.svg`, langsCard(t, data));
  writeFileSync(`${OUT}/activity-${mode}.svg`, activityCard(t, data));
}
console.log(JSON.stringify(data.metrics), data.langs.slice(0, 5).map(([l]) => l).join(","));
