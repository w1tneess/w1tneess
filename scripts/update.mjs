// Rewrites the generated blocks in README.md. Node 20+, no dependencies.
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { picture } from './typeset.mjs';

const GEN = 'assets/generated';

const USER = 'w1tneess';
const FEED = 'https://www.advaitachandra.in/rss.xml';
const headers = { 'User-Agent': USER, Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const esc = (s) => s.replace(/[|<>[\]]/g, (c) => '\\' + c).replace(/\s+/g, ' ').trim();
const html = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nice = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const get = async (url, opts) => {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r;
};

async function writing() {
  const xml = await (await get(FEED)).text();
  const tag = (b, t) => {
    const m = b.match(new RegExp('<' + t + '>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</' + t + '>'));
    return m && m[1].trim();
  };
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, b]) => ({ title: tag(b, 'title'), link: tag(b, 'link'), date: new Date(tag(b, 'pubDate')) }))
    .filter((i) => i.title && i.link && !isNaN(i.date))
    .sort((a, b) => b.date - a.date);
  if (!items.length) throw new Error('no feed items');
  return items.slice(0, 3).map((i, n) => {
    const title = picture(i.title + ' ↗', { size: 26, wrapAt: 34, prefix: String(n + 1).padStart(2, '0'), meta: nice(i.date) }, { dir: GEN, name: `note-${n + 1}`, alt: `${n + 1}. ${i.title}, ${nice(i.date)}` });
    return `<a href="${i.link}">${title}</a>`;
  }).join('\n\n');
}

async function activity() {
  const repos = await (await get(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=10&type=owner`, { headers })).json();
  const rows = [];
  for (const r of repos.filter((r) => !r.fork && !r.private && r.name !== USER).slice(0, 4)) {
    const [c] = await (await get(`https://api.github.com/repos/${r.full_name}/commits?per_page=1`, { headers })).json();
    if (!c?.commit) continue;
    const line = c.commit.message.split('\n')[0].replace(/\s+/g, ' ').trim();
    const msg = html(line.length > 56 ? line.slice(0, 55).trimEnd() + '…' : line);
    // Name, then date, then summary: the date always sits at the same height whatever the summary's length.
    rows.push(`<td width="50%" valign="top">\n<a href="${r.html_url}">${picture(r.name + ' ↗', { size: 22, meta: nice(c.commit.author.date) }, { dir: GEN, name: `repo-${rows.length + 1}`, alt: `${r.name}, ${nice(c.commit.author.date)}` })}</a><br>\n${msg}\n</td>`);
  }
  if (!rows.length) throw new Error('no repos');
  if (rows.length % 2) rows.push('<td width="50%"></td>');
  const trs = [];
  for (let i = 0; i < rows.length; i += 2) trs.push(`<tr>\n${rows[i]}\n${rows[i + 1]}\n</tr>`);
  return `<table>\n${trs.join('\n')}\n</table>`;
}

const blocks = {
  NOW: readFileSync('now.md', 'utf8').trim().split('\n').map((l) => `*${l}*`).join('<br>\n'),
};
// A failed source keeps the previous block instead of blanking it.
for (const [k, fn] of [['WRITING', writing], ['ACTIVITY', activity]]) {
  try { blocks[k] = await fn(); } catch (e) { console.error(`${k}: ${e.message}`); }
}
blocks.STAMP = `<sub>Generated ${nice(new Date())} by <a href="https://github.com/w1tneess/w1tneess/blob/main/.github/workflows/update.yml">a scheduled action</a></sub>`;

let md = readFileSync('README.md', 'utf8');
for (const [k, v] of Object.entries(blocks)) {
  const re = new RegExp(`(<!--${k}:START-->)[\\s\\S]*?(<!--${k}:END-->)`);
  md = md.replace(re, (_, a, b) => `${a}\n${v}\n${b}`);
}
writeFileSync('README.md', md);

// Drop generated images the README no longer references; a failed source above keeps its old images.
for (const f of existsSync(GEN) ? readdirSync(GEN) : []) if (!md.includes(`${GEN}/${f}`)) rmSync(`${GEN}/${f}`);
