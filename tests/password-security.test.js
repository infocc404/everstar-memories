import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { assertPasswordNotBreached } from '../src/lib/password-security.js';

if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });

test('rejects a password found in the breach corpus', async () => {
  const fetcher = async () => new Response('1E4C9B93F3F0682250B6CF8331B7EE68FD8:12', { status: 200 });
  await assert.rejects(
    assertPasswordNotBreached('password', fetcher),
    /appears in known data breaches/
  );
});

test('accepts a password absent from the returned hash range', async () => {
  const fetcher = async (url, options) => {
    assert.match(url, /\/range\/[A-F0-9]{5}$/);
    assert.equal(options.headers['Add-Padding'], 'true');
    assert.equal(options.cache, 'no-store');
    return new Response('00000000000000000000000000000000000:2', { status: 200 });
  };
  await assert.doesNotReject(assertPasswordNotBreached('password', fetcher));
});

test('fails closed when the breach-check service is unavailable', async () => {
  const fetcher = async () => new Response('', { status: 503 });
  await assert.rejects(
    assertPasswordNotBreached('password', fetcher),
    /verification is temporarily unavailable/
  );
});
