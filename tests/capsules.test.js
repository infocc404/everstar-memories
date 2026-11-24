import test from 'node:test';
import assert from 'node:assert/strict';
import { isUnlockDateValid } from '../src/lib/capsules.js';

test('allows a capsule to open on the same calendar day', () => {
  assert.equal(isUnlockDateValid('2026-11-24', '2026-11-24'), true);
});
test('allows a capsule to open after the memory date', () => {
  assert.equal(isUnlockDateValid('2026-11-24', '2027-01-01'), true);
});
test('rejects an opening date before the memory date', () => {
  assert.equal(isUnlockDateValid('2026-11-24', '2026-11-23'), false);
});
test('rejects malformed and impossible dates', () => {
  assert.equal(isUnlockDateValid('24-11-2026', '2027-01-01'), false);
  assert.equal(isUnlockDateValid('2026-02-30', '2027-01-01'), false);
});
