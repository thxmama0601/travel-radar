// A small external clock triggers the existing collection and Pages deployment.
// RSS parsing stays on GitHub Actions, avoiding Workers Free CPU limits.
export const WORKFLOW_URL = 'https://api.github.com/repos/thxmama0601/travel-radar/actions/workflows/refresh-news.yml/dispatches';

export async function triggerRefresh(env, fetcher = fetch) {
  if (!env.GITHUB_DISPATCH_TOKEN) throw new Error('GitHub dispatch secret is not configured');
  const response = await fetcher(WORKFLOW_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'CC-Mama-Travel-Radar-Scheduler',
      'X-GitHub-Api-Version': '2026-03-10',
    },
    body: JSON.stringify({ ref: 'main' }),
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status !== 200 && response.status !== 204) {
    // Never log credentials, request headers, or upstream response bodies.
    throw new Error(`GitHub workflow dispatch failed (HTTP ${response.status})`);
  }
  console.log('Travel news workflow dispatch accepted by GitHub');
}

export default {
  async scheduled(_controller, env) {
    await triggerRefresh(env);
  },
  async fetch(request) {
    if (request.method !== 'GET' || new URL(request.url).pathname !== '/health') {
      return new Response('Not found', { status: 404 });
    }
    // Health is not a claim of a successful collection or an active cron.
    return Response.json({ service: 'travel-radar-scheduler', info: 'Check Cloudflare cron logs and GitHub Actions for execution results.' });
  },
};
