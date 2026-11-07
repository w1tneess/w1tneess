// Builds the GitHub stats + top-languages cards (light/dark) from public API data.
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
  return {
    metrics: [
      ["Repositories", user.public_repos], ["Stars earned", repos.reduce((s, r) => s + r.stargazers_count, 0)], ["Followers", user.followers],
      ["Commits", commits], ["Pull requests", prs], ["Issues", issues],
    ],
    langs: Object.entries(langs).sort((a, b) => b[1] - a[1]),
  };
}

const frame = (t, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="16" fill="${t.bg}" stroke="${t.border}"/>
<text x="28" y="56" font-family="${SANS}" font-size="20" font-weight="500" fill="${t.text}">${esc(title)}</text>${body}</svg>`;

function statsCard(t, { metrics }) {
  const body = metrics.map(([label, v], i) => {
    const x = 28 + (i % 3) * 180, y = 112 + Math.floor(i / 3) * 62;
    return `<text x="${x}" y="${y}" font-family="${SANS}" font-size="28" font-weight="500" style="font-variant-numeric:tabular-nums" fill="${t.text}">${Number(v).toLocaleString("en-US")}</text><text x="${x}" y="${y + 20}" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(label)}</text>`;
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
    return `<rect x="${cx}" y="${cy - 10}" width="10" height="10" rx="2" fill="${t.text}" fill-opacity="${opac[i]}"/><text x="${cx + 18}" y="${cy}" font-family="${SANS}" font-size="16" fill="${t.text}">${esc(l)}</text><text x="${cx + 230}" y="${cy}" text-anchor="end" font-family="${MONO}" font-size="14" fill="${t.muted}">${((n / total) * 100).toFixed(1)}%</text>`;
  }).join("");
  return frame(t, "Top languages", `<clipPath id="c"><rect x="28" y="84" width="${W - 56}" height="10" rx="5"/></clipPath><g clip-path="url(#c)">${bar}</g>${legend}`);
}

const data = await collect();
mkdirSync(OUT, { recursive: true });
for (const [mode, t] of Object.entries(THEMES)) {
  writeFileSync(`${OUT}/stats-${mode}.svg`, statsCard(t, data));
  writeFileSync(`${OUT}/languages-${mode}.svg`, langsCard(t, data));
}
console.log(JSON.stringify(data.metrics), data.langs.slice(0, 5).map(([l]) => l).join(","));
