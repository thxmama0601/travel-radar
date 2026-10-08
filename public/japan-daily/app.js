import { getTopicDraft, isRecommended, validReport } from './draft-model.mjs?v=topic-picker-1';
const $ = (id) => document.getElementById(id);
let currentReport = null;
let selectedIndex = -1;
let generatedDraft = null;
let requestId = 0;
let selectionRevision = 0;

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
function sources(items) {
  const row = element('div', null, 'sources');
  (Array.isArray(items) ? items : []).filter(Boolean).forEach((item) => row.append(safeLink(item.url, item.label)));
  return row;
}
function notice(title, text) {
  $('notice').hidden = false;
  $('notice').querySelector('h2').textContent = title;
  $('notice').querySelector('p').textContent = text;
}
function list(id, items, render = (item) => element('li', item)) {
  $(id).replaceChildren(...(Array.isArray(items) ? items : []).map(render));
}
function fullText(text) {
  const fragment = document.createDocumentFragment();
  const regex = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let offset = 0;
  for (const match of text.matchAll(regex)) {
    fragment.append(document.createTextNode(text.slice(offset, match.index)), safeLink(match[2], match[1]));
    offset = match.index + match[0].length;
  }
  fragment.append(document.createTextNode(text.slice(offset)));
  return fragment;
}
function clearGenerated() {
  selectionRevision += 1;
  generatedDraft = null;
  $('generated').hidden = true;
  $('copy').disabled = true;
  $('copy-status').textContent = '';
  $('drafts').replaceChildren();
  $('generated-topic').textContent = '';
  $('draft-sources').replaceChildren();
  ['angles', 'images', 'extensions'].forEach((id) => $(id).replaceChildren());
  $('angles-section').open = false;
}
function resetSelection() {
  selectedIndex = -1;
  clearGenerated();
  $('generate').disabled = true;
  $('selected-topic').textContent = '尚未選擇題目';
  $('generation-help').textContent = '先從上方選擇一題，再按下「產生 Threads 草稿」。';
}
function selectTopic(index) {
  if (!currentReport?.top10[index]) return;
  selectedIndex = index;
  clearGenerated();
  const topic = currentReport.top10[index];
  const draft = getTopicDraft(currentReport, index);
  $('selected-topic').textContent = '已選擇 ' + String(index + 1).padStart(2, '0') + '｜' + topic.title;
  $('generate').disabled = !draft;
  $('generation-help').textContent = draft
    ? '選題已就緒，按下按鈕即可取得這一題的草稿。'
    : '這題尚未備妥草稿。請選擇其他題目，或等待當日報告更新。';
  document.querySelectorAll('.topic-radio').forEach((radio, i) => {
    radio.checked = i === index;
    radio.closest('.card').classList.toggle('selected', i === index);
  });
  $('composer').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
}
function renderReport(report) {
  currentReport = report;
  resetSelection();
  $('notice').hidden = true;
  $('context').hidden = false;
  $('edition-date').textContent = report.date.replaceAll('-', ' / ');
  $('cutoff').textContent = '搜尋截止：' + report.cutoff;
  document.title = report.date + '｜精選選題與 Threads 草稿';
  $('top-title').textContent = '今日 ' + report.top10.length + ' 個精選選題';
  $('topic-count').textContent = report.top10.length + ' 題可選 · 分數為編輯評估';
  list('top10', report.top10, (item, index) => {
    const card = element('article', null, 'card topic-card');
    const head = element('div', null, 'card-head');
    head.append(element('span', String(index + 1).padStart(2, '0'), 'rank'), element('span', item.score + ' / 100', 'score'));
    card.append(head);
    if (isRecommended(report, index)) card.append(element('span', '編輯推薦', 'recommended-tag'));
    const title = element('h3', item.title);
    title.id = 'topic-title-' + index;
    card.append(title, element('span', (item.region || '地區未提供') + ' · ' + (item.category || '分類未提供'), 'tag'));
    card.append(element('p', '公布：' + (item.announcementDate || '尚未完全確認') + '\n發生／活動：' + (item.eventDate || '尚未完全確認'), 'dates'));
    card.append(element('p', item.why || ''), sources(item.sources));
    const pick = element('label', null, 'topic-select');
    const radio = element('input', null, 'topic-radio');
    radio.type = 'radio';
    radio.name = 'topic';
    radio.value = String(index);
    radio.setAttribute('aria-label', '選擇第 ' + (index + 1) + ' 題：' + item.title);
    radio.addEventListener('change', () => selectTopic(index));
    pick.append(radio, element('span', '選擇這題'), element('small', getTopicDraft(report, index) ? '草稿已備妥' : '草稿尚未備妥'));
    card.append(pick);
    return card;
  });
  list('trends', report.trends);
  const choice = report.choice || {};
  $('choice').replaceChildren(element('h3', '編輯推薦：' + (choice.title || '未指定')), element('p', choice.reason || ''), element('p', choice.versusSecond ? '為什麼不是第二名：' + choice.versusSecond : ''));
  list('followups', report.followups, (item) => {
    const li = element('li');
    li.append(element('strong', item.title), element('p', item.next), sources(item.sources));
    return li;
  });
  // Do not expose an older report's automatic first-choice draft before the user's selection.
  $('research-text').replaceChildren(fullText(typeof report.researchText === 'string' ? report.researchText : '本期詳細查核紀錄尚未提供；請參考各選題卡片的日期與原始來源。'));
}
function generateDraft() {
  const topic = currentReport?.top10[selectedIndex];
  const draft = getTopicDraft(currentReport, selectedIndex);
  if (!topic || !draft) return;
  generatedDraft = draft;
  $('generated-topic').textContent = currentReport.date + ' · ' + topic.title;
  list('drafts', draft.threads, (text, index) => {
    const block = element('div', null, 'draft');
    block.append(element('small', 'THREAD ' + String(index + 1).padStart(2, '0')), document.createTextNode(text));
    return block;
  });
  $('draft-sources').replaceChildren(element('p', '這題的查核來源', 'muted'), sources(topic.sources));
  list('angles', draft.angles, (item, index) => {
    const block = element('div', null, 'angle');
    block.append(element('strong', (index + 1) + '. ' + item.name), element('p', item.opening));
    return block;
  });
  $('angles-section').hidden = !draft.angles.length;
  list('images', draft.images, (item) => {
    const li = element('li', item.description);
    if (item.url) li.append(document.createTextNode(' '), safeLink(item.url, '素材來源'));
    return li;
  });
  $('images-section').hidden = !draft.images.length;
  list('extensions', draft.extensions);
  $('extensions-section').hidden = !draft.extensions.length;
  $('copy').disabled = false;
  $('copy-status').textContent = '';
  $('generated').hidden = false;
  $('threads-title').focus({ preventScroll: true });
  $('generated').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}
async function loadReport(date) {
  const id = ++requestId;
  currentReport = null;
  resetSelection();
  $('top10').replaceChildren();
  $('context').hidden = true;
  $('context').querySelector('details').open = false;
  $('topic-count').textContent = '正在讀取選題';
  notice('正在讀取當日選題', date);
  try {
    const response = await fetch('./reports/' + date + '.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const report = await response.json();
    if (!validReport(report, date)) throw new Error('Invalid report');
    if (id !== requestId) return;
    renderReport(report);
    const url = new URL(location.href);
    url.searchParams.set('date', date);
    history.replaceState(null, '', url);
  } catch {
    if (id !== requestId) return;
    currentReport = null;
    resetSelection();
    $('top10').replaceChildren();
    $('context').hidden = true;
    $('edition-date').textContent = '選題暫時無法讀取';
    $('cutoff').textContent = '請稍後重試';
    $('topic-count').textContent = '無法取得選題';
    notice('這份報告暫時無法讀取', '請稍後重新整理，或從歷史報告選擇其他日期。');
  }
}
$('generate').addEventListener('click', generateDraft);
$('copy').addEventListener('click', async () => {
  if (!generatedDraft) return;
  const revision = selectionRevision;
  try {
    await navigator.clipboard.writeText(generatedDraft.threads.join('\n\n──────────\n\n'));
    if (revision === selectionRevision) $('copy-status').textContent = '已複製這題的完整草稿，可貼上 Threads。';
  } catch {
    if (revision === selectionRevision) $('copy-status').textContent = '瀏覽器未允許複製；請選取下方草稿文字手動複製。';
  }
});
$('report-date').addEventListener('change', (event) => loadReport(event.target.value));
async function init() {
  try {
    const response = await fetch('./reports/manifest.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const manifest = await response.json();
    if (!Array.isArray(manifest.reports)) throw new Error('Invalid manifest');
    const entries = manifest.reports.filter((item) => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date)).sort((a, b) => b.date.localeCompare(a.date));
    if (!entries.length) {
      notice('今日精選選題尚未發布', '完成每日查核後，這裡會提供 10 個精選選題。你選好一題，再按下「產生 Threads 草稿」。');
      return;
    }
    const options = entries.map((item) => { const option = element('option', item.date + (item.title ? ' · ' + item.title : '')); option.value = item.date; return option; });
    $('report-date').replaceChildren(...options);
    $('report-date').disabled = false;
    const requested = new URLSearchParams(location.search).get('date');
    const selected = entries.some((item) => item.date === requested) ? requested : entries[0].date;
    $('report-date').value = selected;
    await loadReport(selected);
  } catch { notice('目前無法取得選題清單', '請確認網路連線後重新整理。若剛完成網站部署，請稍後再試。'); }
}
init();
