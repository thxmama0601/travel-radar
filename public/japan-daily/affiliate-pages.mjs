const pagePlatforms = [
  { id: 'trip', name: 'Trip.com', hosts: ['tw.trip.com', 'www.trip.com'] },
  { id: 'booking', name: 'Booking.com', hosts: ['www.booking.com'] },
  { id: 'kkday', name: 'KKday', hosts: ['www.kkday.com', 'm.kkday.com'] },
  { id: 'klook', name: 'Klook', hosts: ['www.klook.com'] },
];
const pageKinds = ['商品頁', '住宿列表', '交通查詢', '目的地列表'];
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

// Research links are separate from the user's saved affiliate URLs and opt-ins.
export function getAffiliatePageGroups(topic) {
  return pagePlatforms.map(platform => {
    const source = Array.isArray(topic?.affiliatePages) ? topic.affiliatePages.find(group => group?.platform === platform.id) : null;
    const seen = new Set();
    const pages = (Array.isArray(source?.pages) ? source.pages : []).filter(page => {
      if (!page || page.verified !== true || !pageKinds.includes(page.kind)
        || ![page.title, page.reason, page.checks, page.url, page.checkedAt].every(nonempty)
        || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(page.checkedAt)
        || !Number.isFinite(Date.parse(page.checkedAt))) return false;
      try {
        if (/[\s\\\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/u.test(page.url)) return false;
        const url = new URL(page.url);
        if (url.protocol !== 'https:' || !platform.hosts.includes(url.hostname) || url.username || url.password || url.port || seen.has(url.href)) return false;
        seen.add(url.href);
        return true;
      } catch { return false; }
    });
    return { id: platform.id, name: platform.name, pages,
      note: nonempty(source?.note) ? source.note : '本期尚未列出已核對且適合這題的頁面。' };
  });
}

export function createAffiliatePagePanel(topic, { expanded = false } = {}) {
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const groups = getAffiliatePageGroups(topic);
  const total = groups.reduce((sum, group) => sum + group.pages.length, 0);
  const panel = node('details', '', 'affiliate-pages');
  panel.open = expanded;
  panel.append(node('summary', '推薦平台頁面' + (total ? ' · ' + total + ' 個可查看' : ' · 暫無適合頁面')));
  panel.append(node('p', '開啟頁面挑選商品 → 到你的分潤後台取得專屬網址 → 貼入下方欄位並勾選。這裡提供原始頁面，尚未套用你的分潤碼。', 'page-instructions'));
  const grid = node('div', '', 'affiliate-page-grid');
  for (const group of groups) {
    const section = node('section', '', 'affiliate-page-platform');
    section.dataset.platform = group.id;
    section.append(node('h4', group.name));
    if (!group.pages.length) section.append(node('p', group.note, 'muted'));
    for (const page of group.pages) {
      const card = node('article', '', 'affiliate-page');
      card.append(node('span', page.kind, 'page-kind'), node('strong', page.title));
      card.append(node('p', '搭配原因：' + page.reason), node('p', '選購前確認：' + page.checks, 'muted'));
      const checkedAt = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(page.checkedAt));
      card.append(node('small', '本期查閱：' + checkedAt + ' 台灣時間'));
      const actions = node('div', '', 'affiliate-page-actions');
      const link = node('a', '開啟頁面 ↗');
      link.href = page.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', group.name + '：' + page.title + '（另開分頁）');
      const copy = node('button', '複製原始網址', 'secondary-button copy-page-url');
      copy.type = 'button';
      copy.setAttribute('aria-label', '複製 ' + group.name + ' ' + page.title + '的原始網址');
      const status = node('p', '', 'page-copy-status muted');
      status.setAttribute('role', 'status');
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(page.url);
          if (panel.isConnected) status.textContent = '已複製原始網址。請到你的分潤後台取得專屬連結。';
        } catch {
          if (panel.isConnected) status.textContent = '無法自動複製，可對「開啟頁面」連結選擇複製網址。';
        }
      });
      actions.append(link, copy);
      card.append(actions, status);
      section.append(card);
    }
    grid.append(section);
  }
  panel.append(grid, node('p', '頁面查閱不代表指定日期有庫存或可分潤；價格、適用日期與分潤資格以平台及你的帳戶為準。', 'muted page-footnote'));
  return panel;
}
