export const SOCIAL_PLATFORMS = ['Threads', 'X', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'PTT', 'Dcard'];
const timestamp = (value) => typeof value === 'string' && /T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
const numeric = (value) => Number.isSafeInteger(value) && value >= 0;
const HOUR = 3600000;

export function socialPostKey(url, platform) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    const host = u.hostname.replace(/^(www|m|mobile)\./, '');
    let id;
    if (platform === 'Threads' && ['threads.com','threads.net'].includes(host)) id = u.pathname.match(/^\/@[^/]+\/post\/([^/]+)/)?.[1];
    if (platform === 'X' && ['x.com','twitter.com'].includes(host)) id = u.pathname.match(/^\/[^/]+\/status\/(\d+)/)?.[1];
    if (platform === 'Instagram' && host === 'instagram.com') id = u.pathname.match(/^\/(?:p|reel)\/([^/]+)/)?.[1];
    if (platform === 'Facebook' && host === 'facebook.com') id = u.searchParams.get('story_fbid') || u.pathname.match(/\/(?:posts|videos|reel)\/([^/]+)/)?.[1];
    if (platform === 'TikTok' && host === 'tiktok.com') id = u.pathname.match(/^\/@[^/]+\/video\/(\d+)/)?.[1];
    if (platform === 'YouTube' && ['youtube.com','youtu.be'].includes(host)) id = host === 'youtu.be' ? u.pathname.slice(1).split('/')[0] : u.searchParams.get('v') || u.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    if (platform === 'PTT' && host === 'ptt.cc') id = u.pathname.match(/^\/bbs\/[^/]+\/(M\.[^/]+\.html)$/)?.[1];
    if (platform === 'Dcard' && host === 'dcard.tw') id = u.pathname.match(/^\/f\/[^/]+\/p\/(\d+)/)?.[1];
    return id ? platform + ':' + id : null;
  } catch { return null; }
}

export function getSocialHeat(topic, { platform = 'all', referenceTime } = {}) {
  const data = topic?.socialHeat;
  const checked = timestamp(data?.checkedAt);
  const reference = timestamp(referenceTime);
  const result = { available: false, rate: null, samples: [], checkedAt: data?.checkedAt || '', summary: typeof data?.summary === 'string' ? data.summary : '尚未取得足夠的近期社群互動證據。', reason: '', leads: Array.isArray(data?.leads) ? data.leads : [] };
  if (!Number.isFinite(checked) || !Number.isFinite(reference) || reference < checked || reference - checked > 24 * HOUR) {
    return { ...result, reason: '缺少同一期有效觀測時間，或樣本查核已超過 24 小時。' };
  }
  const candidates = [];
  for (const post of Array.isArray(data?.evidence) ? data.evidence : []) {
    const published = timestamp(post?.publishedAt), observed = timestamp(post?.observedAt);
    const key = socialPostKey(post?.url, post?.platform);
    if (!key || (platform !== 'all' && post.platform !== platform) || post.verified !== true || post.sourceType !== 'original'
      || post.kind !== 'organic' || post.matchedEvent !== true || !['creator','reader','media'].includes(post.authorType)
      || typeof post.author !== 'string' || !post.author.trim() || typeof post.contentKey !== 'string' || !post.contentKey.trim()
      || !Number.isFinite(published) || !Number.isFinite(observed) || published > observed || observed > checked
      || checked - published > 48 * HOUR || checked - observed > 24 * HOUR
      || !numeric(post.metrics?.likes) || !numeric(post.metrics?.replies)) continue;
    // Replies receive more weight than likes. Views/reposts with inconsistent visibility stay out of the score.
    const rate = (post.metrics.likes + 3 * post.metrics.replies) / Math.max(6, (observed - published) / HOUR);
    const authorKey = typeof post.authorGroup === 'string' && post.authorGroup.trim() ? post.authorGroup.trim().toLowerCase() : post.platform + ':' + post.author.trim().replace(/^@/, '').toLowerCase();
    candidates.push({ ...post, key, authorKey, rate });
  }
  candidates.sort((a,b) => b.rate - a.rate || a.key.localeCompare(b.key));
  const posts = new Set(), authors = new Set(), contents = new Set();
  for (const post of candidates) {
    if (posts.has(post.key) || authors.has(post.authorKey) || contents.has(post.contentKey)) continue;
    posts.add(post.key); authors.add(post.authorKey); contents.add(post.contentKey);
    result.samples.push(post);
    if (result.samples.length === 5) break;
  }
  if (result.samples.length < 2) return { ...result, reason: '不足 2 個不同作者、不同原創內容的近期有效樣本；未列入熱度排名。' };
  const rates = result.samples.map(post => post.rate).sort((a,b) => a-b);
  const middle = Math.floor(rates.length / 2);
  result.available = true;
  result.rate = rates.length % 2 ? rates[middle] : (rates[middle-1] + rates[middle]) / 2;
  result.reason = '依 ' + result.samples.length + ' 位作者的公開互動樣本排序。';
  return result;
}
