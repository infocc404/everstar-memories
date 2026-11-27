export async function assertPasswordNotBreached(password, fetcher = globalThis.fetch) {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Enter a password to continue.');
  }
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(password));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
  const response = await fetcher('https://api.pwnedpasswords.com/range/' + hash.slice(0, 5), {
    headers: { 'Add-Padding': 'true' },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Password safety verification is temporarily unavailable. Please try again.');
  const suffix = hash.slice(5);
  const compromised = (await response.text()).split(/\r?\n/).some(line => {
    const [candidate, count] = line.trim().split(':');
    return candidate?.toUpperCase() === suffix && Number(count) > 0;
  });
  if (compromised) throw new Error('This password appears in known data breaches. Please choose a different password.');
}
