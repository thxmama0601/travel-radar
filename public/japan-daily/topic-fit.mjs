import { getSocialHeat } from './social-heat.mjs?v=social-1';
const levels = { '高': 3, '中': 2, '低': 1 };
const strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];

export function getAffiliateFit(topic) {
  const fit = topic?.affiliateFit;
  if (!fit || !Object.hasOwn(levels, fit.level) || typeof fit.reason !== 'string' || !fit.reason.trim()) return null;
  return {
    level: fit.level,
    reason: fit.reason,
    products: strings(fit.products),
    platforms: strings(fit.platforms),
    commentOpening: typeof fit.commentOpening === 'string' && [...fit.commentOpening].length <= 180 ? fit.commentOpening.trim() : '',
    checks: typeof fit.checks === 'string' ? fit.checks : '',
  };
}

export function getVisibleTopics(topics, order = 'editorial', filter = 'all', socialContext = {}) {
  const entries = topics.map((topic, index) => ({ topic, index, fit: getAffiliateFit(topic), social: getSocialHeat(topic, socialContext) }));
  const ranked = entries.filter(entry => entry.social.available).sort((a,b) => b.social.rate - a.social.rate || a.index - b.index);
  ranked.forEach((entry, index) => { entry.social.rank = index > 0 && ranked[index-1].social.rate === entry.social.rate ? ranked[index-1].social.rank : index + 1; });
  const visible = entries.filter(({fit}) => filter === 'all' || (fit?.level || '未評估') === filter);
  if (order === 'affiliate') visible.sort((a, b) => (levels[b.fit?.level] || 0) - (levels[a.fit?.level] || 0) || b.topic.score - a.topic.score || a.index - b.index);
  if (order === 'social') visible.sort((a,b) => Number(b.social.available) - Number(a.social.available) || (b.social.rate ?? 0) - (a.social.rate ?? 0) || a.index - b.index);
  return visible;
}
