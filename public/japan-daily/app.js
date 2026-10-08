import { getTopicDraft, isRecommended, validReport, formatThreadCopy, getRecommendedDraftIndex } from './draft-model.mjs?v=threaded-1';
import { composeAffiliateDraft, affiliateCommentTemplate } from './affiliate-model.mjs?v=kkday-25165-1';
import { createAffiliateEditor } from './affiliate-editor.mjs?v=kkday-25165-1';
import { getAffiliateFit, getVisibleTopics } from './topic-fit.mjs?v=social-1';
import { createAffiliatePagePanel } from './affiliate-pages.mjs?v=kkday-25165-1';
const $ = (id) => document.getElementById(id);
let currentReport = null;
let selectedIndex = -1;
let generatedDraft = null;
let requestId = 0;
let selectionRevision = 0;
const affiliateEditor = createAffiliateEditor({ onChange: clearGenerated });

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
  $('affiliate-replies').hidden = true;
  $('copy-comments').disabled = true;
  $('copy-comments').textContent = '複製留言（分潤）';
  $('comments-status').textContent = '';
  $('comments').replaceChildren();
  $('drafts').replaceChildren();
  $('generated-topic').textContent = '';
  $('draft-sources').replaceChildren();
  ['angles', 'images', 'extensions'].forEach((id) => $(id).replaceChildren());
  $('angles-section').open = false;
}
function resetSelection() {
  selectedIndex = -1;
  clearGenerated();
  affiliateEditor.load(null, null, null);
  $('selected-fit').replaceChildren();
  $('selected-pages').replaceChildren();
  const recommendedIndex = getRecommendedDraftIndex(currentReport);
  $('generate').disabled = recommendedIndex < 0;
  $('generate-label').textContent = recommendedIndex < 0 ? '產生脆串文' : '用推薦題目產生脆串文';
  $('selected-topic').textContent = '尚未選擇題目';
  $('generation-help').textContent = recommendedIndex < 0
    ? '先從上方選擇一題，再按下「產生脆串文」。'
    : '可以先選題，也可以直接使用本期編輯推薦：' + currentReport.top10[recommendedIndex].title + '。';
}
function selectTopic(index, { scroll = true } = {}) {
  if (!currentReport?.top10[index]) return;
  selectedIndex = index;
  $('filter-status').textContent = '';
  clearGenerated();
  const topic = currentReport.top10[index];
  const draft = getTopicDraft(currentReport, index);
  const fit = getAffiliateFit(topic);
  affiliateEditor.load(currentReport, topic, draft);
  $('selected-fit').replaceChildren(fitSummary(topic));
  $('selected-pages').replaceChildren(createAffiliatePagePanel(topic, { expanded: true, onUseKkday: page => affiliateEditor.useKkdayPage(page) }));
  if (fit?.commentOpening) $('selected-fit').append(element('p', '留言切角：' + fit.commentOpening));
  if (fit?.checks) $('selected-fit').append(element('p', '搭配前確認：' + fit.checks, 'muted'));
  $('selected-topic').textContent = '已選擇 ' + String(index + 1).padStart(2, '0') + '｜' + topic.title;
  $('generate').disabled = !draft;
  $('generate-label').textContent = '產生脆串文';
  $('generation-help').textContent = draft
    ? '選題已就緒。主文會拆成多串，每串可分開複製；分潤連結另外放在留言。'
    : '這題尚未備妥草稿。請選擇其他題目，或等待當日報告更新。';
  document.querySelectorAll('.topic-radio').forEach((radio) => {
    radio.checked = Number(radio.value) === index;
    radio.closest('.card').classList.toggle('selected', radio.checked);
  });
  if (scroll) $('composer').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}
function fitSummary(topic) {
  const fit = getAffiliateFit(topic);
  const box = element('div', null, 'fit-summary');
  box.append(element('strong', '留言分潤適合度：' + (fit?.level || '未評估'), 'fit-badge fit-' + ({高:'high',中:'medium',低:'low'}[fit?.level] || 'unknown')));
  if (!fit) { box.append(element('p', '本期尚未提供評估，不以內容分數推算。')); return box; }
  box.append(element('p', fit.reason));
  if (fit.products.length) box.append(element('p', '可搭配：' + fit.products.join('、')));
  if (fit.platforms.length) box.append(element('p', '可查找平台：' + fit.platforms.join('、'), 'muted'));
  return box;
}
function renderTopics() {
  if (!currentReport) return;
  const report = currentReport;
  const context = { platform: $('social-platform').value, referenceTime: report.socialResearch?.checkedAt };
  const entries = getVisibleTopics(report.top10, $('topic-order').value, $('fit-filter').value, context);
  const allEntries = getVisibleTopics(report.top10, 'social', 'all', context);
  const verifiedCount = allEntries.filter(entry => entry.social.available).length;
  const platformName = context.platform === 'all' ? '全部平台' : context.platform;
  const observed = report.socialResearch?.checkedAt ? '觀測：' + formatTime(report.socialResearch.checkedAt) + '。' : '';
  $('social-status').textContent = verifiedCount
    ? platformName + '：' + verifiedCount + ' / ' + report.top10.length + ' 題有足夠樣本可排名。未確認者置後、保留內容原序。' + observed
    : platformName + '：本期尚無足夠樣本建立熱度排名。社群排序暫保留內容原序，未確認不等於不熱門。' + observed;
  if ($('topic-order').value !== 'social') $('social-status').textContent += '目前使用其他選題排序。';
  $('social-limitations').textContent = report.socialResearch?.limitation || '只代表已查核的公開樣本，並非平台全站排行榜。';
  $('topic-count').textContent = entries.length + ' / ' + report.top10.length + ' 題 · 內容分數為編輯評估';
  $('filter-status').textContent = selectedIndex >= 0 && !entries.some(({index}) => index === selectedIndex) ? '目前選題不在篩選結果中；下方仍保留你的選擇。' : '';
  list('top10', entries, ({ topic: item, index, social }) => {
    const card = element('article', null, 'card topic-card');
    const head = element('div', null, 'card-head');
    const rankLabel = $('topic-order').value === 'social' && social.available ? '社群 ' + String(social.rank).padStart(2,'0') : '選題 ' + String(index + 1).padStart(2, '0');
    head.append(element('span', rankLabel, 'rank'), element('span', '內容 ' + item.score + ' / 100', 'score'));
    card.append(head);
    if (isRecommended(report, index)) card.append(element('span', '編輯推薦', 'recommended-tag'));
    const title = element('h3', item.title);
    title.id = 'topic-title-' + index;
    card.append(title, element('span', (item.region || '地區未提供') + ' · ' + (item.category || '分類未提供'), 'tag'));
    card.append(element('p', '公布：' + (item.announcementDate || '尚未完全確認') + '\n發生／活動：' + (item.eventDate || '尚未完全確認'), 'dates'));
    card.append(element('p', item.why || ''), sources(item.sources));
    card.append(fitSummary(item));
    card.append(createAffiliatePagePanel(item));
    card.append(socialSummary(social));
    const pick = element('label', null, 'topic-select');
    const radio = element('input', null, 'topic-radio');
    radio.type = 'radio';
    radio.name = 'topic';
    radio.value = String(index);
    radio.checked = index === selectedIndex;
    card.classList.toggle('selected', radio.checked);
    radio.setAttribute('aria-label', '選擇第 ' + (index + 1) + ' 題：' + item.title);
    radio.addEventListener('change', () => selectTopic(index));
    pick.append(radio, element('span', '選擇這題'), element('small', getTopicDraft(report, index) ? '草稿已備妥' : '草稿尚未備妥'));
    card.append(pick);
    return card;
  });
  if (!entries.length) $('top10').append(element('p', '本期沒有符合這個分潤適合度的選題，試試其他篩選條件。', 'muted'));
}
function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '時間未確認' : new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).format(date) + ' 台灣時間';
}
function socialSummary(social) {
  const box = element('div', null, 'social-summary');
  box.append(element('strong', social.available ? '社群互動樣本：可排名' : '社群熱度：未確認'));
  box.append(element('p', social.available ? '樣本互動速率 ' + social.rate.toFixed(1) + ' · ' + social.samples.length + ' 位作者（非全站熱度）' : social.summary));
  if (!social.available) box.append(element('p', social.reason, 'muted'));
  if (social.samples.length || social.leads.length) {
    const details = element('details', null, 'social-evidence');
    details.append(element('summary', '查看社群證據與查核限制'));
    social.samples.forEach(post => {
      const item = element('div', null, 'social-post');
      item.append(safeLink(post.url, post.platform + ' · ' + post.author));
      item.append(element('p', '發布 ' + formatTime(post.publishedAt) + '；觀測 ' + formatTime(post.observedAt)));
      item.append(element('p', '讚 ' + post.metrics.likes + ' · 留言 ' + post.metrics.replies));
      const extras = [['reposts','轉發'],['views','觀看']].filter(([key]) => Number.isSafeInteger(post.metrics[key]) && post.metrics[key] >= 0).map(([key,label]) => label + ' ' + post.metrics[key]);
      if (extras.length) item.append(element('p', extras.join(' · ') + '（展示，不計入排序）'));
      if (typeof post.note === 'string') item.append(element('p', post.note));
      details.append(item);
    });
    social.leads.filter(item => item && typeof item.url === 'string' && typeof item.reason === 'string').forEach(lead => {
      const item = element('div', null, 'social-post');
      item.append(safeLink(lead.url, lead.label || '查核線索'), element('p', '未計入熱度：' + lead.reason));
      details.append(item);
    });
    box.append(details);
  }
  return box;
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
  renderTopics();
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
  if (selectedIndex < 0) {
    const recommendedIndex = getRecommendedDraftIndex(currentReport);
    if (recommendedIndex < 0) return;
    selectTopic(recommendedIndex, { scroll: false });
    renderTopics();
  }
  const topic = currentReport?.top10[selectedIndex];
  const draft = getTopicDraft(currentReport, selectedIndex);
  if (!topic || !draft) return;
  const composed = composeAffiliateDraft(draft.threads, affiliateEditor.getEntries(), getAffiliateFit(topic)?.commentOpening);
  affiliateEditor.showError(composed);
  if (composed.error) { clearGenerated(); return; }
  const isCommentTemplate = !composed.comments.length;
  const comments = isCommentTemplate ? [affiliateCommentTemplate(getAffiliateFit(topic)?.commentOpening)] : composed.comments;
  generatedDraft = { ...draft, threads: composed.threads, comments, isCommentTemplate };
  $('generated-topic').textContent = currentReport.date + ' · ' + topic.title;
  if (composed.linkCount) $('generated-topic').textContent += ' · 另備 ' + composed.linkCount + ' 個分潤連結的留言';
  const total = generatedDraft.threads.length;
  $('generated-topic').textContent += ' · 主文共 ' + total + ' 串';
  list('drafts', generatedDraft.threads, (text, index) => {
    const block = element('article', null, 'draft thread-draft');
    const heading = element('div', null, 'thread-heading');
    const label = element('h3', '主文第 ' + (index + 1) + ' 串／共 ' + total + ' 串');
    label.id = 'main-thread-title-' + index;
    block.setAttribute('aria-labelledby', label.id);
    const copyButton = element('button', '複製第 ' + (index + 1) + ' 串', 'secondary-button copy-thread');
    copyButton.type = 'button';
    const status = element('p', '', 'muted thread-copy-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    copyButton.addEventListener('click', async () => {
      const revision = selectionRevision;
      try {
        await navigator.clipboard.writeText(formatThreadCopy(text, index, total));
        if (revision === selectionRevision && block.isConnected) status.textContent = '已複製第 ' + (index + 1) + ' 串。' + (index === 0 ? '先發布這一串，再接續後面的主文。' : '請接在上一串後方發布。');
      } catch {
        if (revision === selectionRevision && block.isConnected) status.textContent = '瀏覽器未允許複製，請選取這串文字手動複製。';
      }
    });
    heading.append(label, copyButton);
    block.append(heading, element('div', formatThreadCopy(text, index, total), 'thread-text'), status);
    return block;
  });
  list('comments', comments, (text, index) => {
    const block = element('div', null, 'draft');
    const label = isCommentTemplate ? '留言（分潤）範本 · 待填網址' : comments.length === 1 ? '留言（分潤）' : '留言（分潤）' + (index + 1) + '／' + comments.length;
    block.append(element('small', label), document.createTextNode(text));
    return block;
  });
  $('affiliate-replies').hidden = false;
  $('copy-comments').disabled = false;
  $('copy-comments').textContent = isCommentTemplate ? '複製留言範本（待填網址）' : '複製留言（分潤）';
  $('comments-status').textContent = isCommentTemplate ? '尚未加入分潤連結。以下是待填網址的留言範本；請換成你的實際連結再發布。也可在上方填入網址並勾選後重新產生。沒有適合的商品時，可只發布主文。' : '';
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
  $('social-status').textContent = '';
  $('social-limitations').textContent = '';
  $('filter-status').textContent = '';
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
$('topic-order').addEventListener('change', renderTopics);
$('fit-filter').addEventListener('change', renderTopics);
$('social-platform').addEventListener('change', renderTopics);
$('copy-comments').addEventListener('click', async () => {
  if (!generatedDraft?.comments.length) return;
  const revision = selectionRevision;
  const isCommentTemplate = generatedDraft.isCommentTemplate;
  try {
    await navigator.clipboard.writeText(generatedDraft.comments.join('\n\n──────────\n\n'));
    if (revision === selectionRevision) $('comments-status').textContent = isCommentTemplate
      ? '已複製留言範本。請將〔待填網址〕位置換成你的實際分潤連結，再貼在主文下方；沒有適合商品時可略過。'
      : '已複製分潤留言，請貼在你的 Threads 貼文下方。';
  } catch {
    if (revision === selectionRevision) $('comments-status').textContent = '瀏覽器未允許複製，請選取留言文字手動複製。';
  }
});
$('copy').addEventListener('click', async () => {
  if (!generatedDraft) return;
  const revision = selectionRevision;
  try {
    await navigator.clipboard.writeText(generatedDraft.threads.map((text, index, items) => formatThreadCopy(text, index, items.length)).join('\n\n──────────\n\n'));
    if (revision === selectionRevision) $('copy-status').textContent = '已複製全部主文，含串序與分隔線。發布時請分串貼上，或使用各串的複製按鈕。分潤留言請另外複製。';
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
      notice('今日精選選題尚未發布', '完成每日查核後，這裡會提供 10 個精選選題。你選好一題，再按下「產生脆串文」。');
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
