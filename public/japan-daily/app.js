'use strict';
const $ = (id) => document.getElementById(id);
let currentReport = null;
let requestId = 0;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  if (className) node.className = className;
  return node;
}
function safeLink(url, label) {
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return element('span', label);
    const link = element('a', label || parsed.hostname);
    link.href = parsed.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  } catch { return element('span', label || '來源網址尚未提供'); }
}
function sources(items = []) {
  const row = element('div', null, 'sources');
  items.forEach((item) => row.append(safeLink(item.url, item.label)));
  return row;
}
function notice(title, text) {
  $('notice').hidden = false;
  $('notice').querySelector('h2').textContent = title;
  $('notice').querySelector('p').textContent = text;
}
function list(id, items, render = (item) => element('li', item)) {
  $(id).replaceChildren(...items.map(render));
}
function fullText(text) {
  // Display report text safely; make its Markdown source links clickable.
  const fragment = document.createDocumentFragment();
  const regex = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let offset = 0;
  for (const match of text.matchAll(regex)) {
    fragment.append(document.createTextNode(text.slice(offset, match.index)));
    fragment.append(safeLink(match[2], match[1]));
    offset = match.index + match[0].length;
  }
  fragment.append(document.createTextNode(text.slice(offset)));
  return fragment;
}
function renderReport(report) {
  currentReport = report;
  $('notice').hidden = true;
  $('report').hidden = false;
  $('selection-link').href = '#selection';
  $('threads-link').href = '#threads';
  $('edition-date').textContent = report.date.replaceAll('-', ' / ');
  $('cutoff').textContent = `搜尋截止：${report.cutoff}`;
  document.title = `${report.date}｜日本每日內容雷達`;
  list('trends', report.trends || []);
  const choice = report.choice || {};
  const choiceContent = [element('h3', choice.title || '今日首選'), element('p', choice.reason || '')];
  if (choice.versusSecond) choiceContent.push(element('p', `為什麼不是第二名：${choice.versusSecond}`));
  const meta = element('div', null, 'choice-meta');
  [choice.score != null ? `${choice.score} / 100` : null, choice.publishAt, choice.audience, choice.lifecycle].filter(Boolean).forEach((value) => meta.append(element('span', value, 'tag')));
  choiceContent.push(meta);
  $('choice').replaceChildren(...choiceContent);
  $('top-title').textContent = `今日 TOP ${report.top10.length}`;
  list('top10', report.top10, (item, index) => {
    const card = element('article', null, 'card');
    const head = element('div', null, 'card-head');
    head.append(element('span', String(index + 1).padStart(2, '0'), 'rank'), element('span', `${item.score} / 100`, 'score'));
    card.append(head, element('h3', item.title), element('span', `${item.region} · ${item.category}`, 'tag'));
    card.append(element('p', `公布：${item.announcementDate}\n發生／活動：${item.eventDate}`, 'dates'));
    card.append(element('p', item.why), sources(item.sources));
    return card;
  });
  list('drafts', report.threads || [], (text, index) => {
    const block = element('div', null, 'draft');
    block.append(element('small', `THREAD ${String(index + 1).padStart(2, '0')}`), document.createTextNode(text));
    return block;
  });
  $('copy').disabled = !(report.threads || []).length;
  $('copy-status').textContent = '';
  list('angles', report.angles || [], (item, index) => {
    const block = element('div', null, 'angle');
    block.append(element('strong', `${index + 1}. ${item.name}`), element('p', item.opening));
    return block;
  });
  list('images', report.images || [], (item) => {
    const li = element('li', item.description);
    if (item.url) li.append(document.createTextNode(' '), safeLink(item.url, '素材來源'));
    return li;
  });
  list('extensions', report.extensions || []);
  list('followups', report.followups || [], (item) => {
    const li = element('li');
    li.append(element('strong', item.title), element('p', item.next), sources(item.sources));
    return li;
  });
  $('full-report').replaceChildren(fullText(report.fullText || '完整報告尚未提供。'));
}
async function loadReport(date) {
  const id = ++requestId;
  currentReport = null;
  $('report').hidden = true;
  $('selection-link').href = '#notice';
  $('threads-link').href = '#notice';
  notice('正在讀取報告', date);
  try {
    const response = await fetch(`./reports/${date}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const report = await response.json();
    if (report.date !== date || !Array.isArray(report.top10) || typeof report.cutoff !== 'string') throw new Error('Invalid report');
    if (id !== requestId) return;
    renderReport(report);
    const url = new URL(location.href);
    url.searchParams.set('date', date);
    history.replaceState(null, '', url);
  } catch {
    if (id !== requestId) return;
    $('edition-date').textContent = '報告暫時無法讀取';
    $('cutoff').textContent = '請稍後重試';
    notice('這份報告暫時無法讀取', '請稍後重新整理，或從歷史報告選擇其他日期。');
  }
}
$('copy').addEventListener('click', async () => {
  if (!currentReport) return;
  try {
    await navigator.clipboard.writeText(currentReport.threads.join('\n\n──────────\n\n'));
    $('copy-status').textContent = '已複製完整草稿，可貼上 Threads。';
  } catch { $('copy-status').textContent = '瀏覽器未允許複製；請選取下方草稿文字手動複製。'; }
});
$('report-date').addEventListener('change', (event) => loadReport(event.target.value));
async function init() {
  try {
    const response = await fetch('./reports/manifest.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    if (!Array.isArray(manifest.reports)) throw new Error('Invalid manifest');
    const entries = manifest.reports.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date)).sort((a, b) => b.date.localeCompare(a.date));
    if (!entries.length) {
      notice('首份報告尚未發布', '這裡將收錄查核後的今日首選、TOP 10、Threads 草稿與候選評分。完成首份報告並上傳後，即可開始查閱。');
      return;
    }
    const options = entries.map((item) => { const option = element('option', `${item.date}${item.title ? ` · ${item.title}` : ''}`); option.value = item.date; return option; });
    $('report-date').replaceChildren(...options);
    $('report-date').disabled = false;
    const requested = new URLSearchParams(location.search).get('date');
    const selected = entries.some((item) => item.date === requested) ? requested : entries[0].date;
    $('report-date').value = selected;
    await loadReport(selected);
  } catch {
    notice('目前無法取得報告清單', '請確認網路連線後重新整理。若剛完成網站部署，請稍後再試。');
  }
}
init();
