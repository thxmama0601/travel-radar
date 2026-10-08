export const AFFILIATE_PLATFORMS = [
  { id: 'trip', name: 'Trip.com' },
  { id: 'booking', name: 'Booking.com' },
  { id: 'kkday', name: 'KKday' },
  { id: 'klook', name: 'Klook' },
  { id: 'other', name: '其他平台' },
];
const DISCLOSURE = '（分潤連結：透過連結預訂，我可能獲得佣金。）';
const count = (text) => [...text].length;

// User-supplied publisher ID. Apply only to researched KKday pages, never saved custom links.
export const KKDAY_CID = '25165';
export function kkdayAffiliateUrl(value) {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/u.test(value)) return '';
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !['www.kkday.com', 'm.kkday.com'].includes(parsed.hostname) || parsed.username || parsed.password || parsed.port) return '';
    const hashAt = value.indexOf('#');
    const hash = hashAt < 0 ? '' : value.slice(hashAt);
    const base = hashAt < 0 ? value : value.slice(0, hashAt);
    const queryAt = base.indexOf('?');
    const path = queryAt < 0 ? base : base.slice(0, queryAt);
    const parts = queryAt < 0 ? [] : base.slice(queryAt + 1).split('&').filter(part => part && decodeURIComponent(part.split('=')[0]).toLowerCase() !== 'cid');
    // Keep the raw spelling/order of unrelated parameters and the fragment intact.
    return path + '?' + [...parts, 'cid=' + KKDAY_CID].join('&') + hash;
  } catch { return ''; }
}

export function affiliateCommentTemplate(opening = '') {
  return (opening || '行程用得到的話，可以參考這個預訂連結。')
    + '\n\n〔貼上與本篇相關、已確認適用的分潤網址〕\n\n' + DISCLOSURE;
}

export function normalizeAffiliateEntries(value) {
  return AFFILIATE_PLATFORMS.map(({ id }) => {
    const entry = Array.isArray(value) ? value.find((item) => item?.id === id) : null;
    return { id, enabled: entry?.enabled === true, label: typeof entry?.label === 'string' ? entry.label : '', url: typeof entry?.url === 'string' ? entry.url : '' };
  });
}

export function affiliateTopicKey(date, topic) {
  return 'japan-radar:affiliate:v1:topic:' + JSON.stringify([date, topic.id || topic.title]);
}

// Preserve the supplied URL, including all tracking parameters and their order.
export function validateAffiliateLinks(entries, selectedOnly = true) {
  const links = [];
  for (const entry of normalizeAffiliateEntries(entries)) {
    if (selectedOnly ? !entry.enabled : !entry.url.trim() && !entry.enabled) continue;
    const platform = AFFILIATE_PLATFORMS.find((item) => item.id === entry.id);
    const url = entry.url.trim();
    try {
      if (!/^https?:\/\//i.test(url) || /[\s\\\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/u.test(url)) throw new Error();
      const parsed = new URL(url);
      if (!parsed.hostname || parsed.username || parsed.password) throw new Error();
    } catch {
      return { links: [], error: platform.name + '：請貼上完整的 http 或 https 分享網址。', field: entry.id + '-url' };
    }
    const label = entry.label.trim();
    if (count(label) > 60 || /[\r\n\u0000-\u001f]/u.test(label)) {
      return { links: [], error: platform.name + '：連結說明請使用 60 字以內的單行文字。', field: entry.id + '-label' };
    }
    links.push({ id: entry.id, label: label ? platform.name + '｜' + label : platform.name, url });
  }
  return { links, error: '', field: '' };
}

export function composeAffiliateDraft(threads, entries, opening = '') {
  const header = (opening || '行程用得到的話，可參考這些預訂連結。') + '\n' + DISCLOSURE;
  const validation = validateAffiliateLinks(entries);
  if (validation.error) return { ...validation, threads: [], comments: [] };
  const { links } = validation;
  if (!links.length) return { threads: [...threads], comments: [], linkCount: 0, error: '', field: '' };
  const extra = [];
  let current = header;
  for (const link of links) {
    const block = '\n\n' + link.label + '\n' + link.url;
    if (count(header + block) > 500) {
      return { threads: [], comments: [], error: link.label + ' 的網址太長，請改用平台提供的短網址；系統不會刪除追蹤參數。', field: link.id + '-url' };
    }
    if (count(current + block) > 500) { extra.push(current); current = header; }
    current += block;
  }
  extra.push(current);
  // Affiliate replies are copied separately. Never alter the editorial post.
  return { threads: [...threads], comments: extra, linkCount: links.length, error: '', field: '' };
}
