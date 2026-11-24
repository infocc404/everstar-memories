const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
async function encryptionKey() {
  const encoded = Deno.env.get("MEMORY_ENCRYPTION_KEY");
  if (!encoded) throw new Error("MEMORY_ENCRYPTION_KEY is not configured.");
  const raw = base64ToBytes(encoded);
  if (raw.length !== 32) throw new Error("MEMORY_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
export async function encryptPayload(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(JSON.stringify(value)));
  return { version: 1, algorithm: "AES-256-GCM", iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}
export async function decryptPayload(value: { version: number; iv: string; ciphertext: string }) {
  if (value.version !== 1) throw new Error("Unsupported encrypted memory format.");
  const key = await encryptionKey();
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(value.iv) }, key, base64ToBytes(value.ciphertext));
  return JSON.parse(decoder.decode(plaintext));
}
