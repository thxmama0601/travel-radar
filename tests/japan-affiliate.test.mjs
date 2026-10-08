import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAffiliateEntries, affiliateTopicKey, validateAffiliateLinks, composeAffiliateDraft } from '../public/japan-daily/affiliate-model.mjs';

const link = (url, extra = {}) => ({ id: 'trip', enabled: true, label: '札幌住宿', url, ...extra });
test('affiliate URLs retain exact tracking parameters, escapes, ordering and fragments', () => {
  const url = 'https://partner.example/reserve?aid=001&target=https%3A%2F%2Fexample.com%2Fhotel&tag=A+B&tag=C%20D#rooms';
  const original = ['已查核的住宿資訊'];
  const result = composeAffiliateDraft(original, [link('  ' + url + '  ')]);
  assert.equal(result.error, '');
  assert.equal(result.linkCount, 1);
  assert(result.comments.join('\n').includes(url));
  assert(result.comments.join('\n').includes('可能獲得佣金'));
  assert(result.comments.join('\n').includes('Trip.com｜札幌住宿'));
  assert.deepEqual(result.threads, original);
  assert.deepEqual(original, ['已查核的住宿資訊']);
});
test('unselected links never enter a draft, even when filled or invalid', () => {
  const original = ['第一串', '第二串'];
  assert.deepEqual(composeAffiliateDraft(original, [link('javascript:alert(1)', { enabled: false })]).threads, original);
  assert.equal(composeAffiliateDraft(original, []).linkCount, 0);
  assert.deepEqual(composeAffiliateDraft(original, []).comments, []);
});
test('selected links require an absolute web URL without credentials or embedded whitespace', () => {
  for (const url of ['', 'javascript:alert(1)', 'data:text/plain,x', '//example.com', 'https://user:password@example.com', 'https://example.com/a b', 'https://example.com/\ntrack', 'https://example.com/\\path', 'https://example.com/\u202etrack']) {
    const result = composeAffiliateDraft(['文案'], [link(url)]);
    assert(result.error, url);
    assert.equal(result.field, 'trip-url');
    assert.deepEqual(result.threads, []);
  }
  assert.equal(validateAffiliateLinks([link('https://affiliate-network.example/go?a=123')]).error, '');
});
test('all four platforms can be included without changing their links', () => {
  const entries = ['trip', 'booking', 'kkday', 'klook'].map((id) => ({ id, enabled: true, url: 'https://partner.example/' + id }));
  const result = composeAffiliateDraft(['旅遊資訊'], entries);
  assert.equal(result.error, '');
  assert.equal(result.linkCount, 4);
  entries.forEach(({url}) => assert(result.comments.join('\n').includes(url)));
  assert.deepEqual(result.threads, ['旅遊資訊']);
});
test('long affiliate blocks split between links with disclosure repeated on each added thread', () => {
  const entries = ['trip', 'booking', 'kkday', 'klook'].map((id) => ({ id, enabled: true, url: 'https://partner.example/' + id + '?ref=' + 'a'.repeat(220) }));
  const result = composeAffiliateDraft(['旅'.repeat(480)], entries);
  assert.equal(result.error, '');
  assert.equal(result.threads.length, 1);
  assert.equal(result.comments.length, 4);
  assert(result.comments.every((thread) => [...thread].length <= 500));
  result.comments.forEach((thread) => assert(thread.includes('可能獲得佣金')));
  entries.forEach(({url}) => assert(result.comments.some((thread) => thread.includes(url))));
});
test('oversized URLs report errors; a five-part post leaves affiliate replies separate', () => {
  const result = composeAffiliateDraft(['文案'], [link('https://partner.example/?ref=' + 'a'.repeat(500))]);
  assert(result.error.includes('短網址'));
  assert.deepEqual(result.threads, []);
  const crowded = composeAffiliateDraft(Array(5).fill('文'.repeat(490)), [link('https://partner.example/go')]);
  assert.equal(crowded.error, '');
  assert.equal(crowded.threads.length, 5);
  assert.equal(crowded.comments.length, 1);
});
test('topic-specific comment opening appears only in replies', () => {
  const result = composeAffiliateDraft(['貼文正文'], [link('https://partner.example')], '先核對住宿位置，再挑選行程。');
  assert.deepEqual(result.threads, ['貼文正文']);
  assert(result.comments[0].startsWith('先核對住宿位置，再挑選行程。'));
  assert(result.comments[0].includes('可能獲得佣金'));
});
test('stored data is normalized and keyed separately for each date and topic', () => {
  assert.equal(normalizeAffiliateEntries(null).length, 5);
  assert(normalizeAffiliateEntries({}).every((entry) => !entry.enabled && !entry.url));
  assert.equal(normalizeAffiliateEntries([{id:'trip',enabled:'true',url:42}])[0].enabled, false);
  assert.notEqual(affiliateTopicKey('2026-10-08', {id:'a'}), affiliateTopicKey('2026-10-08', {id:'b'}));
  assert.notEqual(affiliateTopicKey('2026-10-08', {id:'a'}), affiliateTopicKey('2026-10-09', {id:'a'}));
});
test('presets validate filled links even when unchecked; unknown platforms are ignored', () => {
  assert(validateAffiliateLinks([link('bad', {enabled:false})], false).error);
  assert.equal(validateAffiliateLinks([link('', {enabled:false})], false).error, '');
  assert.equal(composeAffiliateDraft(['文案'], [link('https://example.com', {id:'unknown'})]).linkCount, 0);
  assert.equal(composeAffiliateDraft(['文案'], [link('https://example.com', {label:'x\n惡意文字'})]).field, 'trip-label');
});
