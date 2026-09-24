// Reading a published snapshot is cheap and independent from collecting feeds.
export const SNAPSHOT_POLL_MS = 60_000;
export const SNAPSHOT_STALE_MS = 45 * 60_000;

export function snapshotRequestUrl(endpoint, baseUrl, now = Date.now()) {
  const url = new URL(endpoint, baseUrl);
  url.searchParams.set('_refresh', String(now));
  return url.href;
}

export function watchNews({ refresh, onTick, intervalMs, documentRef = document, timers = globalThis }) {
  const sync = () => { onTick(); if (!documentRef.hidden) void refresh(); };
  sync();
  const poll = timers.setInterval(sync, intervalMs);
  const clock = timers.setInterval(onTick, 15_000);
  documentRef.addEventListener('visibilitychange', sync);
  return () => {
    timers.clearInterval(poll);
    timers.clearInterval(clock);
    documentRef.removeEventListener('visibilitychange', sync);
  };
}
