export function isRecommended(report, index) {
  const topic = report?.top10?.[index];
  const choice = report?.choice;
  if (!topic || !choice) return false;
  if (choice.id && topic.id) return choice.id === topic.id;
  return typeof choice.title === 'string' && choice.title === topic.title
    && report.top10.filter((item) => item.title === choice.title).length === 1;
}

export function normalizeDraft(draft) {
  if (!draft || !Array.isArray(draft.threads) || draft.threads.length < 1 || draft.threads.length > 5
    || draft.threads.some((text) => typeof text !== 'string' || !text.trim())) return null;
  return {
    threads: draft.threads.map((text) => text.trim()),
    angles: Array.isArray(draft.angles) ? draft.angles.filter((item) => item && typeof item.name === 'string' && typeof item.opening === 'string') : [],
    images: Array.isArray(draft.images) ? draft.images.filter((item) => item && typeof item.description === 'string') : [],
    extensions: Array.isArray(draft.extensions) ? draft.extensions.filter((text) => typeof text === 'string') : [],
  };
}

export function getTopicDraft(report, index) {
  if (!Number.isInteger(index) || index < 0 || !Array.isArray(report?.top10) || index >= report.top10.length) return null;
  const topic = report.top10[index];
  // An explicitly missing or invalid draft must never borrow another topic's content.
  if (Object.hasOwn(topic, 'draft')) return normalizeDraft(topic.draft);
  // Legacy reports contain one root draft. Match only the uniquely identified editor's pick.
  return isRecommended(report, index) ? normalizeDraft(report) : null;
}

export function formatThreadCopy(text, index, total) {
  return (index + 1) + '/' + total + '\n\n' + text;
}

export function getRecommendedDraftIndex(report) {
  const matches = (report?.top10 || []).map((_, index) => index).filter((index) => isRecommended(report, index));
  return matches.length === 1 && getTopicDraft(report, matches[0]) ? matches[0] : -1;
}

export function validReport(report, date) {
  return report?.date === date && typeof report.cutoff === 'string'
    && Array.isArray(report.top10) && report.top10.length > 0 && report.top10.length <= 10
    && report.top10.every((item) => item && typeof item.title === 'string' && item.title.trim()
      && typeof item.score === 'number' && Number.isFinite(item.score) && item.score >= 0 && item.score <= 100);
}
