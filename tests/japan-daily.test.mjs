import test from 'node:test';
import assert from 'node:assert/strict';
import { getTopicDraft, validReport, formatThreadCopy, getRecommendedDraftIndex } from '../public/japan-daily/draft-model.mjs';
const makeReport = () => ({date:'2026-10-08',cutoff:'12:00 Asia/Taipei',choice:{title:'B'},top10:[{title:'A',score:90,draft:{threads:['A 的草稿']}},{title:'B',score:85,draft:{threads:['B 的第一串','B 的第二串']}}],threads:['舊版編輯首選草稿']});
test('one-click recommendation identifies the actual choice, never an arbitrary first topic', () => {
  const report = makeReport();
  assert.equal(getRecommendedDraftIndex(report), 1);
  report.top10[1].draft = null;
  assert.equal(getRecommendedDraftIndex(report), -1);
  delete report.top10[1].draft;
  assert.equal(getRecommendedDraftIndex(report), 1);
  report.top10[0].title = 'B';
  assert.equal(getRecommendedDraftIndex(report), -1);
  report.choice = {title:'missing'};
  assert.equal(getRecommendedDraftIndex(report), -1);
  assert.equal(getRecommendedDraftIndex(null), -1);
});
test('short authored threads stay separate and individually copied text retains its own numbering', () => {
  const threads = getTopicDraft(makeReport(), 1).threads;
  assert.deepEqual(threads, ['B 的第一串','B 的第二串']);
  assert.equal(formatThreadCopy(threads[0], 0, threads.length), '1/2\n\nB 的第一串');
  assert.equal(formatThreadCopy(threads[1], 1, threads.length), '2/2\n\nB 的第二串');
});
test('each selected topic resolves only its own draft and keeps thread order', () => {
  const report = makeReport();
  assert.deepEqual(getTopicDraft(report, 0).threads, ['A 的草稿']);
  assert.deepEqual(getTopicDraft(report, 1).threads, ['B 的第一串','B 的第二串']);
  assert.equal(getTopicDraft(report, -1), null);
  assert.equal(getTopicDraft(report, 2), null);
});
test('legacy draft belongs only to the uniquely identified editor choice', () => {
  const report = makeReport();
  report.top10.forEach((topic) => delete topic.draft);
  assert.equal(getTopicDraft(report, 0), null);
  assert.deepEqual(getTopicDraft(report, 1).threads, ['舊版編輯首選草稿']);
  report.top10[0].title = 'B';
  assert.equal(getTopicDraft(report, 1), null);
});
test('missing or malformed per-topic content cannot borrow the legacy draft', () => {
  const report = makeReport();
  for (const invalid of [null, {}, {threads:[]}, {threads:['  ']}, {threads:[null]}, {threads:Array(6).fill('text')}]) {
    report.top10[1].draft = invalid;
    assert.equal(getTopicDraft(report, 1), null);
  }
});
test('report loading rejects mismatched dates, empty pools, invalid scores and more than ten topics', () => {
  const report = makeReport();
  assert.equal(validReport(report, report.date), true);
  assert.equal(validReport(report, '2026-10-07'), false);
  assert.equal(validReport({...report,top10:[]}, report.date), false);
  assert.equal(validReport({...report,top10:[{title:'A',score:101}]}, report.date), false);
  assert.equal(validReport({...report,top10:Array(11).fill(report.top10[0])}, report.date), false);
});
