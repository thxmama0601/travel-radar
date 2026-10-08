import test from 'node:test';
import assert from 'node:assert/strict';
import { getSocialHeat, socialPostKey } from '../public/japan-daily/social-heat.mjs';
import { getVisibleTopics } from '../public/japan-daily/topic-fit.mjs';
const checkedAt='2026-10-08T11:00:00+08:00';
const context={referenceTime:checkedAt};
const post=(id,likes=120,extra={})=>({url:'https://www.threads.com/@creator'+id+'/post/Post'+id,platform:'Threads',author:'creator'+id,authorType:'creator',kind:'organic',sourceType:'original',verified:true,matchedEvent:true,contentKey:'content'+id,publishedAt:'2026-10-08T05:00:00+08:00',observedAt:checkedAt,metrics:{likes,replies:4},...extra});
const topic=(evidence)=>({score:80,socialHeat:{checkedAt,evidence}});

test('rank uses verified post interactions and explicit timestamps, not editor scores',()=>{
 const low=topic([post('a',60),post('b',60)]),high=topic([post('c',300),post('d',300)]);
 low.score=99; high.score=20;
 const heat=getSocialHeat(low,context);
 assert.equal(heat.available,true); assert.equal(heat.rate,12);
 const entries=getVisibleTopics([low,high], 'social','all',context);
 assert.deepEqual(entries.map(e=>e.index),[1,0]);
 assert.equal(entries[0].social.rank,1); assert.equal(entries[1].social.rank,2);
});
test('duplicate URL aliases, same author and syndicated content cannot manufacture breadth',()=>{
 const a=post('a');
 for(const other of [{...a,url:a.url.replace('threads.com','threads.net')+'?utm=x'},post('b',200,{author:'@CREATORa'}),post('c',200,{contentKey:a.contentKey}),post('d',200,{authorGroup:'same-owner'})]) {
  const first=other.authorGroup?{...a,authorGroup:'same-owner'}:a;
  assert.equal(getSocialHeat(topic([first,other]),context).available,false);
 }
});
test('original posts required: announcements, giveaways, ads, mirrors and snippets stay unranked',()=>{
 for(const change of [{kind:'giveaway'},{kind:'promotion'},{kind:'repost'},{authorType:'official'},{sourceType:'mirror'},{verified:false},{matchedEvent:false},{url:'https://www.threads.com/@creator'},{url:'https://evil.example/@creator/post/123'}]) {
  const heat=getSocialHeat(topic([post('a'),post('b',120,change)]),context);
  assert.equal(heat.available,false); assert.equal(heat.rate,null);
 }
});
test('missing counters are not zero; two verified zero-count posts are valid observations',()=>{
 for(const metrics of [{likes:1},{likes:1,replies:null},{likes:'100',replies:2},{likes:-1,replies:2}]) assert.equal(getSocialHeat(topic([post('a'),post('b',120,{metrics})]),context).available,false);
 assert.equal(getSocialHeat(topic([post('a',0,{metrics:{likes:0,replies:0}}),post('b',0,{metrics:{likes:0,replies:0}})]),context).rate,0);
});
test('old, future and timezone-free observations are excluded; missing reference time cannot rank',()=>{
 for(const change of [{publishedAt:'2026-10-06T10:59:59+08:00'},{publishedAt:'2026-10-08T12:00:00+08:00'},{observedAt:'2026-10-08T12:00:00+08:00'},{publishedAt:'2026-10-07T05:00:00+08:00',observedAt:'2026-10-07T06:00:00+08:00'},{observedAt:'2026-10-08T11:00:00'}]) assert.equal(getSocialHeat(topic([post('a'),post('b',120,change)]),context).available,false);
 assert.equal(getSocialHeat(topic([post('a'),post('b')])).available,false);
 assert.equal(getSocialHeat(topic([post('a'),post('b')]),{referenceTime:'2026-10-09T11:00:01+08:00'}).available,false);
});
test('platform filter never labels X-only samples as Threads popularity',()=>{
 const x=[post('a',120,{platform:'X',url:'https://x.com/reader/status/123'}),post('b',120,{platform:'X',url:'https://x.com/reader2/status/456'})];
 assert.equal(getSocialHeat(topic(x),context).available,true);
 assert.equal(getSocialHeat(topic(x),{...context,platform:'Threads'}).available,false);
 assert.equal(socialPostKey('https://twitter.com/a/status/123?x=1','X'),socialPostKey('https://x.com/a/status/123','X'));
});
test('rate uses a six-hour minimum, median and at most five independent authors',()=>{
 const evidence=Array.from({length:6},(_,i)=>post(String(i),60*(i+1),{publishedAt:'2026-10-08T10:59:00+08:00',metrics:{likes:60*(i+1),replies:0}}));
 const heat=getSocialHeat(topic(evidence),context);
 assert.equal(heat.samples.length,5); assert.equal(heat.rate,40);
});
test('unknowns remain unranked and stable while affiliate filters preserve source indices',()=>{
 const unknown={score:99,affiliateFit:{level:'高',reason:'住宿'}};
 const known={...topic([post('a'),post('b')]),affiliateFit:{level:'高',reason:'票券'}};
 const entries=getVisibleTopics([unknown,known,{score:100}], 'social','高',context);
 assert.deepEqual(entries.map(e=>e.index),[1,0]); assert.equal(entries[1].social.rank,undefined);
 assert.deepEqual(getVisibleTopics([{score:1},{score:100}], 'social').map(e=>e.index),[0,1]);
});
