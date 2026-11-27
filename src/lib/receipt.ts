// Pure helpers for reading a receipt photo (slice 12). No UI, no network: tested in receipt.test.ts.
// The server route sends the photo to the AI with receiptPrompt() and RECEIPT_SCHEMA, then
// checks the answer with toReceiptDraft() before anything reaches the form.

/** What the form gets: each part is null when the receipt didn't show it clearly. */
export type ReceiptDraft = {
  amount: number | null;
  note: string | null;
  date: string | null;
  categoryId: string | null;
};

export type ReceiptCategory = { id: string; name: string; note: string | null };

/** Largest amount the keypad allows (12 digits), so a misread total can't exceed it. */
const MAX_AMOUNT = 999_999_999_999;

/** JSON schema the AI must answer in. */
export const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    isReceipt: { type: "boolean", description: "True if the photo shows a receipt, bill or invoice." },
    store: { type: ["string", "null"], description: "Store or merchant name, short, as printed." },
    date: { type: ["string", "null"], description: "Purchase date as YYYY-MM-DD, or null if not printed." },
    total: {
      type: ["integer", "null"],
      description: "Final amount paid in whole rupiah, after tax, service and discounts. Null if unreadable.",
    },
    categoryId: { type: ["string", "null"], description: "id of the best matching category from the list, or null." },
  },
  required: ["isReceipt", "store", "date", "total", "categoryId"],
} as const;

/** Instructions sent with the photo. Category ids let the AI pick one we can trust. */
export function receiptPrompt(categories: readonly ReceiptCategory[], today: string): string {
  const list = categories
    .map((c) => `- ${c.id}: ${c.name}${c.note ? ` (${c.note})` : ""}`)
    .join("\n");
  return [
    "You read Indonesian shopping receipts for a personal expense tracker.",
    `Today is ${today}.`,
    "From the photo, return:",
    "- store: the shop or merchant name, short (e.g. \"Indomaret\", \"Kopi Kenangan\").",
    "- date: the purchase date as YYYY-MM-DD. Indonesian receipts usually print day before month (25/11/26 is 25 November 2026).",
    "- total: the final amount paid, in whole rupiah as an integer. Indonesian receipts use dots for thousands: \"Rp 35.000\" is 35000, \"12.480,00\" is 12480. Use the grand total after tax, service and discounts, not a subtotal, the cash handed over or the change.",
    "- categoryId: the id of the expense category that fits best, from this list, or null if none fits:",
    list || "(no categories)",
    "If the photo is not a receipt, set isReceipt to false and everything else to null. Use null for anything you cannot read clearly; never guess.",
  ].join("\n");
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date in YYYY-MM-DD, not after today and not more than a year back. */
function validDate(value: unknown, today: string): string | null {
  if (typeof value !== "string") return null;
  const m = ISO_DATE.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  const iso = m[0];
  if (iso > today) return null; // a receipt can't be from the future (usually a day/month mix-up)
  const yearBack = `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`;
  return iso < yearBack ? null : iso;
}

/** Whole rupiah, positive, within what the keypad allows. */
function validAmount(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(/[^\d]/g, "")) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const whole = Math.round(n);
  return whole > 0 && whole <= MAX_AMOUNT ? whole : null;
}

/**
 * Turn the AI's answer into a draft for the form. Anything missing, malformed or outside the
 * user's own categories becomes null, so a bad answer can never put a wrong id or a float in.
 */
export function toReceiptDraft(
  raw: unknown,
  ctx: { categoryIds: readonly string[]; today: string; noteMax: number },
): ReceiptDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.isReceipt === false) return null;
  const store = typeof r.store === "string" ? r.store.replace(/\s+/g, " ").trim().slice(0, ctx.noteMax) : "";
  const draft: ReceiptDraft = {
    amount: validAmount(r.total),
    note: store || null,
    date: validDate(r.date, ctx.today),
    categoryId: typeof r.categoryId === "string" && ctx.categoryIds.includes(r.categoryId) ? r.categoryId : null,
  };
  // Nothing usable: treat it as unreadable.
  return draft.amount === null && draft.note === null && draft.date === null ? null : draft;
}
