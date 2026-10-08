import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getAffiliateFit, getVisibleTopics } from '../public/japan-daily/topic-fit.mjs';
const make = (id,score,level) => ({id,score,affiliateFit:level?{level,reason:'編輯判斷',products:['住宿'],platforms:['Booking.com']}:undefined});

test('affiliate order uses fit first and content score second without mutating original rankings', () => {
  const topics = [make('news',95,'低'),make('ticket',80,'高'),make('hotel',88,'高'),make('route',90,'中'),make('old',99)];
  assert.deepEqual(getVisibleTopics(topics).map(x=>x.index),[0,1,2,3,4]);
  assert.deepEqual(getVisibleTopics(topics,'affiliate').map(x=>x.index),[2,1,3,0,4]);
  assert.deepEqual(topics.map(x=>x.id),['news','ticket','hotel','route','old']);
  assert.deepEqual(getVisibleTopics(topics,'affiliate','高').map(x=>x.index),[2,1]);
});
test('unknown or malformed fit is unassessed, not a fabricated low score', () => {
  for(const affiliateFit of [undefined,{}, {level:'高'}, {level:'高',reason:' '}, {level:'boom',reason:'text'}]) assert.equal(getAffiliateFit({affiliateFit}),null);
  const topics=[make('a',95),make('b',80,'低')];
  assert.deepEqual(getVisibleTopics(topics,'affiliate','未評估').map(x=>x.index),[0]);
  assert.deepEqual(getVisibleTopics(topics,'editorial','高'),[]);
});
test('ties retain stable identity so sorting cannot select another topic draft', () => {
  const topics=[make('a',80,'高'),make('b',80,'高'),make('c',90,'高')];
  const visible=getVisibleTopics(topics,'affiliate');
  assert.deepEqual(visible.map(x=>x.index),[2,0,1]);
  visible.forEach(({topic,index})=>assert.equal(topic,topics[index]));
});
test('published edition includes reasoned assessments and candidate audit without changing content scores', async () => {
  const report=JSON.parse(await readFile(new URL('../public/japan-daily/reports/2026-10-08.json',import.meta.url),'utf8'));
  assert.equal(report.top10.length,10);
  for(const topic of report.top10) {
    const fit=getAffiliateFit(topic);
    assert(fit && fit.reason && fit.checks, topic.id);
    assert.equal(topic.score,Object.values(topic.scoreBreakdown).reduce((sum,v)=>sum+v,0));
    assert.deepEqual(topic.affiliateFit,report.candidates.find(c=>c.id===topic.id).affiliateFit);
  }
  assert(report.candidates.every(c=>c.affiliateFit));
  assert.equal(getVisibleTopics(report.top10,'affiliate','高').length,3);
});
