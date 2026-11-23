// Pure helpers for the Log transaction sheet. No UI, no Supabase: tested in log.test.ts.

/** The keypad allows up to 12 digits (just under Rp 1 trillion), as in the mockup. */
export const KEYPAD_MAX_DIGITS = 12;

export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "000" | "back";

/** Apply one keypad press to the typed digits. Leading zeros are dropped; overflow is ignored. */
export function pressKey(digits: string, key: KeypadKey): string {
  if (key === "back") return digits.slice(0, -1);
  const next = (digits + key).replace(/^0+/, "");
  return next.length > KEYPAD_MAX_DIGITS ? digits : next;
}

/** Typed digits -> whole rupiah. "" -> 0. */
export function digitsToAmount(digits: string): number {
  return digits ? Number(digits) : 0;
}

type Ranked = { id: string; sortOrder: number };

/**
 * Categories for the chips: most used first (by how many transactions use them),
 * ties and unused ones in their own sort order.
 */
export function rankByUse<T extends Ranked>(items: readonly T[], usedIds: readonly (string | null)[]): T[] {
  const count = new Map<string, number>();
  for (const id of usedIds) if (id) count.set(id, (count.get(id) ?? 0) + 1);
  return [...items].sort((a, b) => (count.get(b.id) ?? 0) - (count.get(a.id) ?? 0) || a.sortOrder - b.sortOrder);
}

/**
 * Default account: the one on the most recently created transaction, if it is still available;
 * otherwise the first available account. `recent` must be newest first.
 */
export function defaultAccountId(
  available: readonly { id: string }[],
  recent: readonly { accountId: string }[],
): string | null {
  const ids = new Set(available.map((a) => a.id));
  for (const t of recent) if (ids.has(t.accountId)) return t.accountId;
  return available[0]?.id ?? null;
}

/** Local calendar date as YYYY-MM-DD (the user's day, not UTC). */
export function localDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Today", "Yesterday", "Sat, 5 Dec", or "Sat, 5 Dec 2025" for another year. */
export function dateLabel(iso: string, today: string = localDate()): string {
  if (iso === today) return "Today";
  const t = parseLocal(today);
  const yesterday = localDate(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1));
  if (iso === yesterday) return "Yesterday";
  const d = parseLocal(iso);
  const base = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === t.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Two- or three-letter badge for an account: "GoPay" -> "GP", "BCA" -> "BCA", "Jago" -> "JA". */
export function accountBadge(name: string): string {
  const caps = name.replace(/[^A-Z]/g, "");
  if (caps.length >= 2 && caps.length <= 3) return caps;
  return name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "·";
}
