import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { getAffiliatePageGroups } from '../public/japan-daily/affiliate-pages.mjs';
import { composeAffiliateDraft } from '../public/japan-daily/affiliate-model.mjs';

const example = {title:'票券',url:'https://www.klook.com/zh-TW/activity/695-tokyo-disney-resort-1-day-pass-tokyo/',kind:'商品頁',reason:'園區門票',checks:'核對園區及日期',checkedAt:'2026-10-08T15:56:18+08:00',verified:true};
const groupsFor = pages => getAffiliatePageGroups({affiliatePages:[{platform:'klook',pages}]});
test('unverified, malformed, cross-platform and deceptive URLs cannot appear as recommendations', () => {
  for (const url of ['javascript:alert(1)','http://www.klook.com/ticket','https://www.klook.com.evil.test/ticket','https://www.klook.com@evil.test/ticket','https://user@www.klook.com/ticket','https://www.booking.com/ticket','https://www.klook.com:444/ticket','https://www.klook.com/\\evil','https://www.klook.com/\u202eurl']) {
    assert.equal(groupsFor([{...example,url}])[3].pages.length,0,url);
  }
  for (const changed of [{verified:false},{checkedAt:'yesterday'},{checkedAt:'2026-10-08T15:56:18'},{kind:'不明'},{checks:''}]) {
    assert.equal(groupsFor([{...example,...changed}])[3].pages.length,0);
  }
  assert.deepEqual(groupsFor([example,example])[3].pages,[example]);
});
test('missing historical data stays unknown for each platform without borrowing another topic', () => {
  for (const topic of [null,{}, {affiliatePages:{}}, {affiliatePages:[null]}]) {
    const groups = getAffiliatePageGroups(topic);
    assert.deepEqual(groups.map(g=>g.id),['trip','booking','kkday','klook']);
    assert(groups.every(g=>g.pages.length===0 && g.note.includes('尚未')));
  }
});
test('published recommendations stay separate from commission comments and preserve authored drafts', async () => {
  const report = JSON.parse(await fs.readFile(new URL('../public/japan-daily/reports/2026-10-08.json',import.meta.url),'utf8'));
  let count=0;
  for (const topic of report.top10) {
    const groups=getAffiliatePageGroups(topic);
    const pages=groups.flatMap(g=>g.pages);
    count+=pages.length;
    assert.equal(pages.length,topic.affiliatePages.flatMap(g=>g.pages).length);
    assert(groups.every(g=>g.pages.length || g.note));
    for (const p of pages) assert(!new URL(p.url).search,'public links must not inherit search-engine affiliate tags');
    const composed=composeAffiliateDraft(topic.draft.threads,[],topic.affiliateFit.commentOpening);
    assert.deepEqual(composed.threads,topic.draft.threads);
    assert.deepEqual(composed.comments,[]);
  }
  assert(count>0);
});
