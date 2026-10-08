import { AFFILIATE_PLATFORMS, normalizeAffiliateEntries, affiliateTopicKey, validateAffiliateLinks, kkdayAffiliateUrl, KKDAY_CID } from './affiliate-model.mjs?v=kkday-25165-1';
import { getAffiliatePageGroups } from './affiliate-pages.mjs?v=kkday-25165-1';

export function createAffiliateEditor({ onChange }) {
  const $ = (id) => document.getElementById(id);
  const presetKey = 'japan-radar:affiliate:v1:presets';
  let activeKey = null;
  const controls = new Map();
  const status = (text) => { $('affiliate-status').textContent = text; };
  const read = (key) => {
    try { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }
    catch { status('無法讀取已存連結，仍可貼上網址產生草稿。'); return null; }
  };
  const write = (key, entries, success) => {
    try { localStorage.setItem(key, JSON.stringify(entries)); status(success); return true; }
    catch { status('瀏覽器無法儲存，這次仍可使用；重新整理後請再次貼上連結。'); return false; }
  };
  const getEntries = () => [...controls].map(([id, row]) => ({ id, enabled: row.enabled.checked, label: row.label.value, url: row.url.value, ...(id === 'kkday' ? { defaultHandled: true } : {}) }));
  const fill = (entries) => normalizeAffiliateEntries(entries).forEach((entry) => {
    const row = controls.get(entry.id);
    row.enabled.checked = entry.enabled;
    row.label.value = entry.label;
    row.url.value = entry.url;
  });
  const clearError = () => {
    $('affiliate-error').textContent = '';
    controls.forEach((row) => [row.url, row.label].forEach((input) => input.removeAttribute('aria-invalid')));
  };
  const showError = ({ error, field }) => {
    clearError();
    if (!error) return;
    $('affiliate-options').open = true;
    $('affiliate-error').textContent = error;
    const input = field ? $('affiliate-' + field) : null;
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
  };
  const persist = () => {
    if (!activeKey) return;
    clearError();
    onChange();
    write(activeKey, getEntries(), '已自動儲存這題的連結。修改後，請重新產生貼文與留言。');
  };
  for (const { id, name } of AFFILIATE_PLATFORMS) {
    const row = document.createElement('div'); row.className = 'affiliate-row';
    const enabledLabel = document.createElement('label'); enabledLabel.className = 'affiliate-toggle';
    const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.id = 'affiliate-' + id + '-enabled';
    enabledLabel.append(enabled, document.createTextNode(name));
    row.append(enabledLabel);
    const fields = {};
    for (const [key, title, placeholder] of [['label', '連結說明（選填）', '例如：札幌車站附近住宿'], ['url', '你的分潤網址', '貼上此平台的完整分潤連結']]) {
      const label = document.createElement('label'); label.textContent = title;
      const input = document.createElement('input');
      input.type = key === 'url' ? 'url' : 'text';
      input.id = 'affiliate-' + id + '-' + key;
      input.placeholder = placeholder;
      input.setAttribute('aria-label', name + ' ' + title);
      input.setAttribute('aria-describedby', 'affiliate-error');
      if (key === 'url') { input.autocomplete = 'off'; input.spellcheck = false; input.setAttribute('autocapitalize', 'none'); }
      else input.maxLength = 60;
      label.append(input); row.append(label); fields[key] = input;
      input.addEventListener('input', persist);
    }
    enabled.addEventListener('change', persist);
    controls.set(id, { enabled, ...fields });
    $('affiliate-fields').append(row);
  }
  $('affiliate-save-presets').addEventListener('click', () => {
    const entries = getEntries();
    const result = validateAffiliateLinks(entries, false);
    showError(result);
    if (result.error) return;
    write(presetKey, entries.map((entry) => ({ ...entry, enabled: false })), '已儲存為常用連結；新選題會帶入網址，由你勾選是否加入。');
  });
  $('affiliate-load-presets').addEventListener('click', () => {
    const entries = read(presetKey);
    if (!entries) { status('還沒有常用連結。先貼上網址，再按「儲存為常用連結」。'); return; }
    // Fill only empty URLs so reusing presets cannot overwrite a topic-specific link.
    const presets = normalizeAffiliateEntries(entries);
    fill(getEntries().map((entry) => entry.url.trim() ? entry : { ...presets.find((item) => item.id === entry.id), enabled: false }));
    clearError(); onChange();
    write(activeKey, getEntries(), '已帶入常用連結至空白欄位；請勾選這題需要的平台。');
  });
  return {
    getEntries, showError,
    useKkdayPage(page) {
      if (!activeKey) return;
      const url = kkdayAffiliateUrl(page.url);
      if (!url) return;
      const row = controls.get('kkday');
      row.url.value = url;
      row.label.value = [...page.title].slice(0, 60).join('');
      row.enabled.checked = true;
      $('affiliate-options').open = true;
      persist();
    },
    load(report, topic, draft) {
      activeKey = null;
      clearError(); status(''); fill(null);
      $('affiliate-fields').disabled = !topic;
      $('affiliate-save-presets').disabled = !topic;
      $('affiliate-load-presets').disabled = !topic;
      $('affiliate-suggestions').textContent = '';
      if (!topic) return;
      activeKey = affiliateTopicKey(report.date, topic);
      const saved = read(activeKey);
      const entries = normalizeAffiliateEntries(saved ?? normalizeAffiliateEntries(read(presetKey)).map((entry) => ({ ...entry, enabled: false })));
      const savedKkday = Array.isArray(saved) ? saved.find(entry => entry?.id === 'kkday') : null;
      const pages = getAffiliatePageGroups(topic).find(group => group.id === 'kkday').pages;
      if (pages.length === 1 && !savedKkday?.defaultHandled && !(typeof savedKkday?.url === 'string' && savedKkday.url.trim())) {
        const url = kkdayAffiliateUrl(pages[0].url);
        if (url) {
          Object.assign(entries.find(entry => entry.id === 'kkday'), { url, label: [...pages[0].title].slice(0, 60).join(''), enabled: true });
          status(($('affiliate-status').textContent ? $('affiliate-status').textContent + '\n' : '') + '已帶入本題 KKday 推薦與 cid=' + KKDAY_CID + '，並勾選加入分潤留言；可修改或取消勾選。');
        }
      }
      fill(entries);
      if (getEntries().some((entry) => entry.enabled)) $('affiliate-options').open = true;
      $('affiliate-suggestions').textContent = (draft?.extensions || []).join('\n');
    },
  };
}
