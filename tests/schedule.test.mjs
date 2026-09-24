import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { refreshSnapshot } from '../scripts/collect-news.mjs';
import { REFRESH_INTERVAL_MS } from '../lib/news-config.mjs';

const feed={id:'test-official',name:'Test feed',publisher:'Test',kind:'direct',acceptAll:true,url:'https://example.com/feed',region:'日本'};
const xml=(published)=>`<rss><channel><item><title>日本旅遊新消息</title><link>https://example.com/news</link><pubDate>${published}</pubDate></item></channel></rss>`;
async function cleanup(dir){
  const target=path.resolve(dir),root=path.resolve(tmpdir())+path.sep;
  assert.ok(target.startsWith(root)&&path.basename(target).startsWith('travel-radar-test-'));
  await rm(target,{recursive:true,force:true});
}

test('scheduled snapshots survive process restarts and preserve true source times after failure',async t=>{
  t.mock.method(console,'warn',()=>{});
  const dir=await mkdtemp(path.join(tmpdir(),'travel-radar-test-'));
  const outputFile=path.join(dir,'data','news.json');
  try{
    const published=new Date(Date.now()-3600000).toUTCString();
    const first=await refreshSnapshot({outputFile,selectedFeeds:[feed],fetcher:async()=>new Response(xml(published))});
    assert.equal(first.allFailed,false);assert.equal(first.payload.items.length,1);
    const second=await refreshSnapshot({outputFile,selectedFeeds:[feed],fetcher:async()=>{throw Error('offline');}});
    const saved=JSON.parse(await readFile(outputFile,'utf8'));
    assert.equal(second.allFailed,true);assert.equal(saved.items.length,1);assert.equal(saved.sources[0].status,'stale');
    assert.equal(saved.sources[0].lastSuccessAt,first.payload.sources[0].lastSuccessAt);
    assert.equal(saved.items[0].publishedAt,new Date(published).toISOString());
  }finally{await cleanup(dir);}
});
test('expired fallback articles are removed and invalid snapshots are not overwritten',async t=>{
  t.mock.method(console,'warn',()=>{});
  const dir=await mkdtemp(path.join(tmpdir(),'travel-radar-test-'));
  const outputFile=path.join(dir,'news.json');
  try{
    const old=new Date(Date.now()-8*86400000).toISOString();
    await writeFile(outputFile,JSON.stringify({items:[{id:'old',url:'https://example.com/old',publishedAt:old,sourceIds:[feed.id]}],sources:[{id:feed.id,lastSuccessAt:old}]}));
    const result=await refreshSnapshot({outputFile,selectedFeeds:[feed],fetcher:async()=>{throw Error('offline');}});
    assert.equal(result.payload.items.length,0);
    await writeFile(outputFile,'broken snapshot');
    await assert.rejects(refreshSnapshot({outputFile,selectedFeeds:[feed]}));
    assert.equal(await readFile(outputFile,'utf8'),'broken snapshot');
  }finally{await cleanup(dir);}
});
test('refresh interval is one day',()=>assert.equal(REFRESH_INTERVAL_MS,86400000));
