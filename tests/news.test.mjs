import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,deduplicate,classify,createCollector,TTL,feeds,latestPublication} from '../lib/news-feed.mjs';
const now=Date.parse('2026-09-23T12:00:00Z');
const row=(title='日本機票優惠',link='https://example.com/story',date=new Date(now).toUTCString())=>`<item><title><![CDATA[${title} - Example]]></title><link>${link}</link><pubDate>${date}</pubDate><source>Example</source></item>`;
const rss=(content)=>`<rss version="2.0"><channel>${content}</channel></rss>`;

test('brand channels retain the actual publisher and reject unrelated trip stories',()=>{
 const trip=feeds.find(f=>f.id==='trip-deals');
 const input=rss(row('Trip.com 日本飯店優惠')+row('Road trip 特價行程','https://example.com/unrelated'));
 const items=parseFeed(input,trip,now);
 assert.equal(items.length,1);assert.equal(items[0].publisher,'Example');assert.deepEqual(items[0].sourceIds,['trip-deals']);
 const booking=parseFeed(rss(row('Booking.com 九月優惠')),feeds.find(f=>f.id==='booking-deals'),now);
 assert.equal(booking.length,1);
});
test('RSS handles CDATA and entities, retains actual publication date and publisher',()=>{
 const [item]=parseFeed(rss(row('日本機票優惠 &amp; 新航線')), {region:'日本'}, now);
 assert.equal(item.title,'日本機票優惠 & 新航線');assert.equal(item.publishedAt,new Date(now).toISOString());assert.equal(item.publisher,'Example');
});
test('unsafe links, stale/future reports, irrelevant titles and malformed feeds are rejected',()=>{
 const input=rss(row('日本機票優惠','javascript:alert(1)')+row('日本機票優惠','https://example.com/old','Mon, 01 Jan 2024 00:00:00 GMT')+row('日本機票優惠','https://example.com/future','Mon, 01 Jan 2029 00:00:00 GMT')+row('News'));
 assert.equal(parseFeed(input,{region:'日本'},now).length,0);assert.throws(()=>parseFeed('<html>error</html>',{region:'日本'},now));
});
test('dedup merges regions and sorts reports by actual publication date',()=>{
 const one=parseFeed(rss(row()),{region:'日本'},now)[0];const two={...one,id:'another',url:'https://example.com/reprint',regions:['台灣']};
 const result=deduplicate([one,two]);assert.equal(result.length,1);assert.deepEqual(result[0].regions,['日本','台灣']);assert.deepEqual(one.regions,['日本']);
});
test('policy classification beats deal words; travel quick trips are not sales',()=>{
 assert.equal(classify('日本退稅新制 免費申請'),'政策');assert.equal(classify('週末快閃日本旅遊'),'旅遊');assert.equal(classify('Klook狂折1212元'),'優惠');
});
test('concurrent requests share collection; cache expires; failed sources retain dated stale data',async()=>{
 const originalNow=Date.now;let clock=now;Date.now=()=>clock;let calls=0;let fail=false;
 try {
   const collector=createCollector(async()=>{calls++;if(fail)throw Error('unavailable');return new Response(rss(row()));},feeds.filter(f=>!f.kind));
   const [a,b]=await Promise.all([collector(),collector()]);assert.equal(calls,6);assert.equal(a,b);assert.equal(a.items.length,1);
   await collector();assert.equal(calls,6);clock+=TTL+1;fail=true;
   const stale=await collector();assert.equal(calls,12);assert.equal(stale.items.length,1);assert.ok(stale.sources.every(s=>s.status==='stale'&&s.lastSuccessAt));
   const broken=createCollector(async()=>{throw Error('unavailable');});const empty=await broken();assert.equal(empty.items.length,0);assert.ok(empty.sources.every(s=>s.status==='error'&&s.lastSuccessAt===null));
 } finally {Date.now=originalNow;}
});
test('official feeds retain Japanese announcements and publisher without source tag',()=>{
 const xml=rss('<item><title>訪日外客数の最新情報</title><link>https://www.jnto.go.jp/news/example.html</link><pubDate>'+new Date(now).toUTCString()+'</pubDate></item>');
 const [item]=parseFeed(xml,feeds.find(f=>f.id==='jnto'),now);assert.equal(item.category,'官方公告');assert.equal(item.sourceKind,'direct');assert.equal(item.publisher,'日本政府觀光局 JNTO');assert.deepEqual(item.regions,['日本']);
});
test('ETtoday travel feed keeps local food titles and infers Japanese destinations',()=>{
 const feed=feeds.find(f=>f.id==='ettoday-travel');const items=parseFeed(rss(row('宜蘭老吳胡椒餅重新開幕')+row('新潟蠑螈池環湖步道','https://example.com/jp')),feed,now);
 assert.equal(items.length,2);assert.deepEqual(items[0].regions,['台灣']);assert.deepEqual(items[1].regions,['日本']);
});
test('dedup prefers publisher RSS link and retains both source filters',()=>{
 const item=parseFeed(rss(row()),{id:'search',region:'日本'},now)[0];const direct={...item,id:'direct',url:'https://example.com/direct',sourceKind:'direct',sourceIds:['rss']};
 const [result]=deduplicate([item,direct]);assert.equal(result.url,direct.url);assert.deepEqual(result.sourceIds,['search','rss']);
});
test('stopped RSS stays inactive and never promotes old news using fetch time',async()=>{
 const xml=rss(row('日本旅遊','https://example.com/old','Wed, 29 Sep 2021 15:23:13 +0800'));
 const collector=createCollector(async()=>new Response(xml),[feeds.find(f=>f.id==='cw-rss')]);const data=await collector();
 assert.equal(data.items.length,0);assert.equal(data.sources[0].status,'inactive');assert.equal(data.sources[0].latestPublishedAt,'2021-09-29T07:23:13.000Z');
 assert.equal(latestPublication(xml),data.sources[0].latestPublishedAt);
});
test('site-specific search rejects other publisher domains',()=>{
 const feed=feeds.find(f=>f.id==='supertaste-search');const xml=rss(row().replace('<source>Example</source>','<source url="https://attacker.example">食尚玩家</source>'));
 assert.equal(parseFeed(xml,feed,now).length,0);
 const verified=xml.replace('https://attacker.example','https://supertaste.tvbs.com.tw');assert.equal(parseFeed(verified,feed,now).length,1);
});
