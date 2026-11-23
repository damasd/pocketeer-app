// Money is whole rupiah stored as integers. Display: "Rp 12.480.500" (dot thousands, no decimals).

/** Largest amount the app accepts: 13 digits (just under Rp 10 trillion). */
export const MAX_DIGITS = 13;

function assertWholeRupiah(n: number) {
  if (!Number.isSafeInteger(n)) throw new Error(`Not a whole rupiah amount: ${n}`);
}

/** 1234567 -> "1.234.567" */
export function groupThousands(n: number): string {
  assertWholeRupiah(n);
  return Math.abs(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 12480500 -> "Rp 12.480.500"; -35000 -> "−Rp 35.000" (true minus sign). */
export function formatRupiah(n: number): string {
  const body = `Rp ${groupThousands(n)}`;
  return n < 0 ? `−${body}` : body;
}

/**
 * Turn whatever was typed or pasted into a whole-rupiah amount.
 * Keeps digits only, so "Rp 1.250.000" -> 1250000 and "" -> 0.
 */
export function parseRupiahInput(text: string): number {
  const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, MAX_DIGITS);
  return digits ? Number(digits) : 0;
}

/** "1234567890" -> "•••• 7890"; null when there is no number worth showing. */
export function maskAccountNumber(accountNumber: string | null | undefined): string | null {
  const digits = (accountNumber ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : null;
}
