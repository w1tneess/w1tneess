// Node 24+, no dependencies. Failed remote sources preserve their previous content.
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const USER = 'w1tneess';
const ROOT = new URL('../', import.meta.url);
export const html = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const nice = d => new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'UTC' });
export function safeUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Expected an HTTPS URL');
  return html(url.href);
}
export function replaceBlock(md, key, value) {
  const start = `<!--${key}:START-->`, end = `<!--${key}:END-->`;
  if (md.split(start).length !== 2 || md.split(end).length !== 2 || md.indexOf(start) > md.indexOf(end)) throw new Error(`Invalid ${key} markers`);
  const a = md.indexOf(start) + start.length, b = md.indexOf(end);
  return md.slice(0,a) + '\n' + value + '\n' + md.slice(b);
}
// Bot commits (Actions refreshes, Dependabot) are not the author's work.
export const isBot = c => c.author?.type === 'Bot';
// Latest human, non-merge commit: its message says what actually changed.
export const pickCommit = commits => commits.find(c => !isBot(c) && c.parents?.length < 2) ?? commits.find(c => !isBot(c)) ?? commits[0];
const decode = s => s.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi, entity => {
  const named = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};
  if (named[entity]) return named[entity];
  const hex = /^&#x/i.test(entity), n = parseInt(entity.slice(hex ? 3 : 2,-1),hex ? 16 : 10);
  return Number.isFinite(n) && n <= 0x10ffff ? String.fromCodePoint(n) : entity;
});
export function feedItems(xml) {
  const tag = (s,k) => {
    const value = s.match(new RegExp(`<${k}(?:\\s[^>]*)?>([\\s\\S]*?)</${k}>`, 'i'))?.[1]?.trim() ?? '';
    return decode(value.replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1'));
  };
  return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].map(([,s]) => ({title:tag(s,'title'),url:tag(s,'link'),date:new Date(tag(s,'pubDate'))}))
    .filter(i => i.title && i.url && Number.isFinite(+i.date)).sort((a,b) => b.date-a.date).slice(0,3);
}
async function get(url, github = false) {
  const headers = {'User-Agent':USER};
  if (github) {
    headers.Accept='application/vnd.github+json';
    if(process.env.GITHUB_TOKEN) headers.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const response = await fetch(url, {headers,signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
  return response;
}
async function writing() {
  const items=feedItems(await (await get('https://www.advaitachandra.in/rss.xml')).text());
  if(!items.length) throw new Error('Feed contains no valid items');
  return '<ol>\n'+items.map(i=>`<li><a href="${safeUrl(i.url)}">${html(i.title)}</a> — ${nice(i.date)}</li>`).join('\n')+'\n</ol>';
}
async function activity() {
  const repos=await (await get(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=100&type=owner`,true)).json();
  const selected=repos.filter(r=>!r.fork&&!r.private&&!r.archived&&r.name!==USER).slice(0,4);
  const results=await Promise.allSettled(selected.map(async r=>{
    const commit=pickCommit(await (await get(`https://api.github.com/repos/${r.full_name}/commits?per_page=10`,true)).json());
    if(!commit?.commit) throw new Error('No commit');
    const message=commit.commit.message.split('\n')[0].replace(/\s+/g,' ').trim();
    const short=[...message].slice(0,90).join('')+([...message].length>90?'…':'');
    return { date:new Date(commit.commit.committer.date), text:`<li><a href="${safeUrl(r.html_url)}">${html(r.name)}</a> — ${html(short)} <a href="${safeUrl(commit.html_url)}">(${nice(commit.commit.committer.date)})</a></li>` };
  }));
  // Avoid publishing a partial activity list when a repository request fails.
  if(results.some(r=>r.status==='rejected')||!results.length) throw new Error('Incomplete repository activity');
  const asOf=new Date().toISOString().slice(0,10);
  const start=new Date(asOf+'T00:00:00Z'); start.setUTCDate(start.getUTCDate()-90);
  // Every public, non-fork, non-archived repo counts, so new projects appear without editing this list.
  const tracked=repos.filter(r=>!r.fork&&!r.private&&!r.archived);
  if(!tracked.length) throw new Error('No tracked repositories');
  const history=await Promise.all(tracked.map(async r=>{
    const commits=[];
    for(let page=1;page<=20;page++){
      const batch=await (await get(`https://api.github.com/repos/${r.full_name}/commits?per_page=100&page=${page}`,true)).json();
      commits.push(...batch.filter(c=>!isBot(c)).map(c=>({date:c.commit.committer.date,sha:c.sha})));
      if(batch.length<100 || batch.every(c=>new Date(c.commit.committer.date)<start)) return {repo:r.name,commits};
    }
    throw new Error('History pagination limit reached');
  }));
  const snapshot=new URL('data/activity.json',ROOT),temp=new URL('data/activity.json.tmp',ROOT);
  writeFileSync(temp,JSON.stringify({asOf,repositories:history},null,2)+'\n'); renameSync(temp,snapshot);
  return '<ul>\n'+results.map(r=>r.value).sort((a,b)=>b.date-a.date).map(r=>r.text).join('\n')+'\n</ul>';
}
export async function main() {
  const file=new URL('README.md',ROOT);
  let md=readFileSync(file,'utf8');
  // Validate every marker before any write.
  for(const key of ['NOW','WRITING','ACTIVITY','STAMP']) replaceBlock(md,key,'');
  md=replaceBlock(md,'NOW',html(readFileSync(new URL('now.md',ROOT),'utf8').trim()));
  const sources=await Promise.allSettled([writing(),activity()]);
  sources.forEach((result,index)=>{
    const key=['WRITING','ACTIVITY'][index];
    if(result.status==='fulfilled') md=replaceBlock(md,key,result.value);
    // ::warning:: surfaces a stuck source on the Actions run page instead of failing silently.
    else console.error(`${process.env.GITHUB_ACTIONS?'::warning::':''}${key}: kept previous content (${result.reason.message})`);
  });
  // No date-only commits. Each source retains its data on failure.
  md=replaceBlock(md,'STAMP','<sub>Activity and writing refresh automatically; unavailable sources keep their last successful content.</sub>');
  execFileSync(process.execPath,[fileURLToPath(new URL('scripts/build-assets.mjs',ROOT))],{stdio:'inherit'});
  if(md!==readFileSync(file,'utf8')) { const tmp=new URL('README.md.tmp',ROOT); writeFileSync(tmp,md); renameSync(tmp,file); }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await main();
