import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withRequiredCleanup } from '../unified-prep-cleanup.mjs';

test('cleanup runs after setup/seed failure', async () => {
  let cleaned = false;
  await assert.rejects(withRequiredCleanup(async () => { throw new Error('seed'); },
    async () => { cleaned = true; }), /seed/);
  assert.equal(cleaned, true);
});
test('cleanup runs after browser/UI failure', async () => {
  const events = [];
  await assert.rejects(withRequiredCleanup(async () => {
    events.push('seed'); throw new Error('UI');
  }, async () => events.push('cleanup')), /UI/);
  assert.deepEqual(events, ['seed', 'cleanup']);
});
test('cleanup failure makes successful work fail', async () => {
  await assert.rejects(withRequiredCleanup(async () => 'ok',
    async () => { throw new Error('cleanup'); }), /cleanup/);
});
test('both primary and cleanup errors are preserved', async () => {
  await assert.rejects(withRequiredCleanup(async () => { throw new Error('primary'); },
    async () => { throw new Error('cleanup'); }), error =>
      error instanceof AggregateError && error.errors.map(e => e.message).join(',') === 'primary,cleanup');
});
test('successful cleanup preserves result', async () => {
  assert.equal(await withRequiredCleanup(async () => 42, async () => {}), 42);
});
