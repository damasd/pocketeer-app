// Export transactions as rows for .csv and .xlsx (brief: feature 12). Pure; tested in export.test.ts.

import type { TransactionType } from "@/lib/balances";

export const HEADERS = ["Date", "Type", "Amount", "Category", "From account", "To account", "Note", "Pay period", "Source"];

const TYPE_LABEL: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
  saving_deposit: "Saving deposit",
  saving_withdraw: "Saving withdraw",
};

type ExportTx = {
  date: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  source: string;
};

export type Row = [string, string, number, string, string, string, string, string, string];

/**
 * One row per transaction, oldest first. Amount stays a whole-rupiah number (always positive;
 * the Type column says which way it went), so spreadsheets can add it up.
 */
export function exportRows(
  txs: readonly ExportTx[],
  names: {
    account: (id: string | null) => string;
    category: (id: string | null) => string;
    period: (date: string) => string;
  },
): Row[] {
  return [...txs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [
      t.date,
      TYPE_LABEL[t.type],
      t.amount,
      names.category(t.categoryId),
      names.account(t.accountId),
      t.toAccountId ? names.account(t.toAccountId) : "",
      t.note ?? "",
      names.period(t.date),
      t.source,
    ]);
}

/**
 * A text cell that a spreadsheet would treat as a formula (=, +, -, @, tab, CR) gets a leading
 * apostrophe, so a note like "=HYPERLINK(...)" can't run when the file is opened.
 */
export function safeText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const text = safeText(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV with a byte-order mark so Excel opens Indonesian text and "Rp" correctly. */
export function toCsv(rows: readonly Row[]): string {
  const lines = [HEADERS, ...rows].map((r) => r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** "money-december-2026.csv", "money-all-time.xlsx" */
export function exportFileName(scope: { name: string; year?: string } | null, ext: "csv" | "xlsx"): string {
  const base = scope ? `${scope.name}${scope.year && !scope.name.includes(scope.year) ? ` ${scope.year}` : ""}` : "all time";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `money-${slug}.${ext}`;
}
