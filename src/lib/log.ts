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

// ---- Log modes (slice 6): the sheet's four types map onto the five stored transaction types.

export type LogMode = "expense" | "income" | "transfer" | "saving";
export type SavingDirection = "deposit" | "withdraw";
type StoredType = "expense" | "income" | "transfer" | "saving_deposit" | "saving_withdraw";

export function storedType(mode: LogMode, direction: SavingDirection): StoredType {
  return mode === "saving" ? (direction === "deposit" ? "saving_deposit" : "saving_withdraw") : mode;
}

export function modeOf(type: StoredType): { mode: LogMode; direction: SavingDirection } {
  if (type === "saving_deposit") return { mode: "saving", direction: "deposit" };
  if (type === "saving_withdraw") return { mode: "saving", direction: "withdraw" };
  return { mode: type, direction: "deposit" };
}

/** Category kind used by each mode; transfers have no category. */
export function categoryKindFor(mode: LogMode): "expense" | "income" | "saving" | null {
  return mode === "transfer" ? null : mode;
}

export type AccountGroup = "spending" | "saving";

/**
 * Which account group each side of a transaction may use (Damas, 23 Nov 2026):
 * everyday money moves only between Spending accounts; Saving accounts are reached only
 * through Saving (deposit: Spending -> Saving, withdraw: Saving -> Spending).
 */
export function accountGroupsFor(type: StoredType): { from: AccountGroup; to: AccountGroup | null } {
  switch (type) {
    case "expense":
    case "income":
      return { from: "spending", to: null };
    case "transfer":
      return { from: "spending", to: "spending" };
    case "saving_deposit":
      return { from: "spending", to: "saving" };
    case "saving_withdraw":
      return { from: "saving", to: "spending" };
  }
}

/**
 * Default "To" account for transfers and savings: the "to" of the newest transaction of the same
 * type when it is still allowed (and, for a transfer, not the "from"); otherwise the first allowed
 * account. `allowedTo` is already limited to the right group; `recent` must be newest first.
 */
export function defaultToAccountId(
  type: StoredType,
  fromId: string | null,
  allowedTo: readonly { id: string }[],
  recent: readonly { type: string; toAccountId: string | null }[],
): string | null {
  if (type === "expense" || type === "income") return null;
  const ids = new Set(allowedTo.map((a) => a.id));
  for (const t of recent) {
    if (t.type !== type || !t.toAccountId || !ids.has(t.toAccountId)) continue;
    if (t.toAccountId === fromId) continue;
    return t.toAccountId;
  }
  return allowedTo.find((a) => a.id !== fromId)?.id ?? null;
}

/** What's missing before Save, as a message for the user, or null when it can be saved. */
export function logProblem(input: {
  mode: LogMode;
  amount: number;
  categoryId: string | null;
  fromId: string | null;
  toId: string | null;
}): string | null {
  if (input.amount <= 0) return "Type an amount first.";
  if (input.mode !== "transfer" && !input.categoryId) return "Pick a category.";
  if (!input.fromId) return "Pick an account.";
  if (input.mode === "transfer") {
    if (!input.toId) return "Pick the account to move money to.";
    if (input.toId === input.fromId) return "A transfer needs two different accounts.";
  }
  if (input.mode === "saving" && !input.toId) return "Pick where the saved money goes.";
  return null;
}

/**
 * Label for the Save button: "Save" when the transaction is ready, otherwise the next thing it
 * still needs, short enough to fit the button. Same order as logProblem.
 */
export function saveLabel(input: Parameters<typeof logProblem>[0]): { ready: boolean; label: string } {
  if (input.amount <= 0) return { ready: false, label: "Enter an amount" };
  if (input.mode !== "transfer" && !input.categoryId) return { ready: false, label: "Pick a category" };
  if (!input.fromId) return { ready: false, label: "Pick an account" };
  if (input.mode === "transfer") {
    if (!input.toId) return { ready: false, label: "Pick the To account" };
    if (input.toId === input.fromId) return { ready: false, label: "Pick two different accounts" };
  }
  if (input.mode === "saving" && !input.toId) return { ready: false, label: "Pick the To account" };
  return { ready: true, label: "Save" };
}
