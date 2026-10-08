export const AFFILIATE_PLATFORMS = [
  { id: 'trip', name: 'Trip.com' },
  { id: 'booking', name: 'Booking.com' },
  { id: 'kkday', name: 'KKday' },
  { id: 'klook', name: 'Klook' },
  { id: 'other', name: '其他平台' },
];
const DISCLOSURE = '行程用得到的話，可參考這些預訂連結。\n（分潤連結：透過連結預訂，我可能獲得佣金。）';
const count = (text) => [...text].length;

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

export function composeAffiliateDraft(threads, entries) {
  const validation = validateAffiliateLinks(entries);
  if (validation.error) return { ...validation, threads: [] };
  const { links } = validation;
  if (!links.length) return { threads: [...threads], linkCount: 0, error: '', field: '' };
  const extra = [];
  let current = DISCLOSURE;
  for (const link of links) {
    const block = '\n\n' + link.label + '\n' + link.url;
    if (count(DISCLOSURE + block) > 500) {
      return { threads: [], error: link.label + ' 的網址太長，請改用平台提供的短網址；系統不會刪除追蹤參數。', field: link.id + '-url' };
    }
    if (count(current + block) > 500) { extra.push(current); current = DISCLOSURE; }
    current += block;
  }
  extra.push(current);
  const result = [...threads];
  if (result.length && count(result.at(-1) + '\n\n' + extra[0]) <= 500) result[result.length - 1] += '\n\n' + extra.shift();
  result.push(...extra);
  if (result.length > 5 || result.some((thread) => count(thread) > 500)) {
    return { threads: [], error: '加入後超過 5 串或單串 500 字，請減少勾選的平台，或使用平台提供的短網址。', field: '' };
  }
  return { threads: result, linkCount: links.length, error: '', field: '' };
}
