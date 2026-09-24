import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { triggerRefresh, WORKFLOW_URL } from '../cloudflare/scheduler.mjs';

test('external clock requests the existing default-branch workflow', async () => {
  let calls = 0;
  await triggerRefresh({ GITHUB_DISPATCH_TOKEN: 'test-only-token' }, async (url, options) => {
    calls++;
    assert.equal(url, WORKFLOW_URL);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-only-token');
    assert.equal(options.headers['X-GitHub-Api-Version'], '2026-03-10');
    assert.deepEqual(JSON.parse(options.body), { ref: 'main' });
    return Response.json({ workflow_run_id: 123 }, { status: 200 });
  });
  assert.equal(calls, 1);
});

test('legacy successful dispatch responses are also accepted', async () => {
  await triggerRefresh({ GITHUB_DISPATCH_TOKEN: 'test-only-token' }, async () => new Response(null, { status: 204 }));
});

test('missing or rejected credentials fail visibly without disclosing secrets', async () => {
  await assert.rejects(triggerRefresh({}, () => { throw new Error('Must not call'); }), /not configured/);
  await assert.rejects(triggerRefresh({ GITHUB_DISPATCH_TOKEN: 'test-only-token' }, async () => new Response('sensitive upstream text', { status: 401 })), /^Error: GitHub workflow dispatch failed \(HTTP 401\)$/);
});

test('public HTTP requests cannot trigger collection', async () => {
  assert.equal((await worker.fetch(new Request('https://example.com/refresh', { method: 'POST' }))).status, 404);
  assert.equal((await worker.fetch(new Request('https://example.com/health'))).status, 200);
});
