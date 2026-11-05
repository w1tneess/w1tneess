import {test} from 'node:test';
import assert from 'node:assert/strict';
import {html,safeUrl,feedItems,replaceBlock,isBot,pickCommit} from '../scripts/update.mjs';
test('recent-commit pick skips bots and merges but falls back instead of failing',()=>{
 const bot={sha:'bot',author:{type:'Bot'},parents:[1]}, merge={sha:'merge',author:{type:'User'},parents:[1,2]}, work={sha:'work',author:{type:'User'},parents:[1]};
 assert.ok(isBot(bot)&&!isBot(work)&&!isBot({author:null}));
 assert.equal(pickCommit([bot,merge,work]).sha,'work');
 assert.equal(pickCommit([bot,merge]).sha,'merge');
 assert.equal(pickCommit([bot]).sha,'bot');
});
test('feed text is decoded then safely escaped for HTML',()=>{
 const [item]=feedItems('<rss><item><title><![CDATA[A &amp; B <script>]]></title><link>https://example.com/a?a=1&amp;b=2</link><pubDate>2026-10-26</pubDate></item></rss>');
 assert.equal(html(item.title),'A &amp; B &lt;script&gt;');
 assert.equal(safeUrl(item.url),'https://example.com/a?a=1&amp;b=2');
 assert.throws(()=>safeUrl('javascript:alert(1)'));
 assert.throws(()=>safeUrl('https://user:pass@example.com'));
});
test('invalid feeds cannot erase the current writing block',()=>assert.deepEqual(feedItems('<rss><item><title>No date</title></item></rss>'),[]));
test('block edits preserve literal dollar strings and surrounding content',()=>{
 assert.equal(replaceBlock('before<!--NOW:START-->old<!--NOW:END-->after','NOW','$&'), 'before<!--NOW:START-->\n$&\n<!--NOW:END-->after');
 assert.throws(()=>replaceBlock('no markers','NOW','x'));
 assert.throws(()=>replaceBlock('<!--NOW:END--><!--NOW:START-->','NOW','x'));
});
