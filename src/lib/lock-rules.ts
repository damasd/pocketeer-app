// App lock rules (PIN + Face ID before the app opens). Pure and tested in lock-rules.test.ts.
// The lock is a privacy screen on this device on top of the email sign-in: Supabase still decides
// what data the signed-in user can read. Only a salted PBKDF2 hash of the PIN is ever stored.

export const PIN_LENGTH = 6;
export const PBKDF2_ITERATIONS = 210_000;
export const FREE_ATTEMPTS = 5;

/** Choices for "Lock after" (time in the background before the PIN is asked again). */
export const LOCK_AFTER_CHOICES = [
  { ms: 0, label: "Immediately" },
  { ms: 60_000, label: "1 min" },
  { ms: 5 * 60_000, label: "5 min" },
  { ms: 15 * 60_000, label: "15 min" },
] as const;

/** A PIN is 6 digits, not all the same and not a straight run (123456, 654321). */
export function pinProblem(pin: string): string | null {
  if (!/^\d+$/.test(pin) || pin.length !== PIN_LENGTH) return `Use ${PIN_LENGTH} digits.`;
  if (/^(\d)\1+$/.test(pin)) return "Avoid the same digit six times.";
  const d = [...pin].map(Number);
  const up = d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const down = d.every((x, i) => i === 0 || x === d[i - 1] - 1);
  if (up || down) return "Avoid a straight run like 123456.";
  return null;
}

/** Lock again on return when the app was away at least `lockAfterMs`. */
export function shouldLockOnReturn(hiddenAt: number | null, now: number, lockAfterMs: number): boolean {
  return hiddenAt !== null && now - hiddenAt >= lockAfterMs;
}

/**
 * After 5 wrong PINs, wait before the next try: 30 s, then doubling each further miss,
 * up to 15 minutes. Returns the time the next try is allowed, or null when allowed now.
 */
export function lockoutUntil(failed: number, lastFailAt: number): number | null {
  if (failed < FREE_ATTEMPTS) return null;
  const wait = Math.min(30_000 * 2 ** (failed - FREE_ATTEMPTS), 15 * 60_000);
  return lastFailAt + wait;
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function newSalt(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)));
}

/** PBKDF2-SHA-256 of the PIN with this salt, base64. */
export async function hashPin(pin: string, salt: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromB64(salt), iterations },
    key,
    256,
  );
  return toB64(new Uint8Array(bits));
}

/** Compare two hashes without stopping at the first different character. */
export function sameHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---- shared with the server layout (this file has no "use client") ----

export const LOCK_CONFIG_KEY = "pocketeer.lock.v1";
/** Set on <html> while the app must not be seen (locked, or covered in the background). */
export const COVER_ATTR = "data-locked";

/**
 * Inline script for <head>: hides the page before it is drawn when a lock is set, so the numbers
 * never flash before the lock screen appears.
 */
export const PRE_HIDE_SCRIPT = `try{if(localStorage.getItem("${LOCK_CONFIG_KEY}"))document.documentElement.setAttribute("${COVER_ATTR}","")}catch(e){}`;
