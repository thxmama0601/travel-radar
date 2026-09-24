import test from 'node:test';
import assert from 'node:assert/strict';
import { watchNews, snapshotRequestUrl, SNAPSHOT_POLL_MS } from '../lib/news-refresh.mjs';

test('snapshot requests stay inside the Pages project and bypass old URL caches',()=>{
  const a=snapshotRequestUrl('./data/news.json','https://example.github.io/travel-radar/',1000);
  const b=snapshotRequestUrl('./data/news.json','https://example.github.io/travel-radar/',2000);
  assert.equal(new URL(a).pathname,'/travel-radar/data/news.json');
  assert.notEqual(a,b);
  assert.equal(new URL(b).searchParams.get('_refresh'),'2000');
});

test('page syncs every minute, immediately resumes from a hidden tab, and cleans up',()=>{
  let reads=0,ticks=0; const intervals=new Map(),listeners=new Map();
  const documentRef={hidden:false,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
  const timers={setInterval:(fn,delay)=>{intervals.set(delay,fn);return delay;},clearInterval:(id)=>intervals.delete(id)};
  const stop=watchNews({refresh:()=>reads++,onTick:()=>ticks++,intervalMs:SNAPSHOT_POLL_MS,documentRef,timers});
  assert.equal(reads,1);
  intervals.get(60_000)(); assert.equal(reads,2);
  documentRef.hidden=true; intervals.get(60_000)(); assert.equal(reads,2);
  documentRef.hidden=false; listeners.get('visibilitychange')(); assert.equal(reads,3);
  intervals.get(15_000)(); assert.equal(ticks,5);
  stop(); assert.equal(intervals.size,0); assert.equal(listeners.size,0);
});
