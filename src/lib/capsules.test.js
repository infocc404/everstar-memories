import test from 'node:test';
import assert from 'node:assert/strict';
import { isUnlockDateValid } from './capsules.js';

test('accepts a capsule opening on the memory date', () => {
  assert.equal(isUnlockDateValid('2026-11-27', '2026-11-27'), true);
});

test('accepts a capsule opening after the memory date', () => {
  assert.equal(isUnlockDateValid('2026-11-27', '2026-12-01'), true);
});

test('rejects an opening date before the memory date', () => {
  assert.equal(isUnlockDateValid('2026-11-27', '2026-11-26'), false);
});

test('rejects impossible calendar dates', () => {
  assert.equal(isUnlockDateValid('2026-02-30', '2026-03-01'), false);
  assert.equal(isUnlockDateValid('2026-02-28', '2026-02-30'), false);
});

test('rejects malformed and missing dates', () => {
  assert.equal(isUnlockDateValid('27-11-2026', '2026-11-27'), false);
  assert.equal(isUnlockDateValid('2026-11-27', ''), false);
  assert.equal(isUnlockDateValid(null, '2026-11-27'), false);
});
