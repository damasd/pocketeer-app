"use client";

import type { MoneyMove, TransactionType } from "@/lib/balances";
import { createStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

export type Transaction = MoneyMove & {
  id: string;
  date: string; // YYYY-MM-DD
  categoryId: string | null;
  note: string | null;
  source: "manual" | "receipt" | "voice";
  createdAt: string;
};

export type NewTransaction = {
  date: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  note: string | null;
};

export const NOTE_MAX = 120;

type Row = {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  note: string | null;
  source: Transaction["source"];
  created_at: string;
};

const COLUMNS = "id, date, type, amount, account_id, to_account_id, category_id, note, source, created_at";
const PAGE = 1000; // Supabase returns at most 1000 rows per request

const fromRow = (r: Row): Transaction => ({
  id: r.id,
  date: r.date,
  type: r.type,
  amount: Number(r.amount),
  accountId: r.account_id,
  toAccountId: r.to_account_id,
  categoryId: r.category_id,
  note: r.note,
  source: r.source,
  createdAt: r.created_at,
});

/** Newest first: by date, then by when it was entered. */
const newestFirst = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);

const store = createStore<Transaction[]>(async () => {
  const all: Transaction[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase()
      .from("transactions")
      .select(COLUMNS)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as Row[]).map(fromRow));
    if (data.length < PAGE) return all;
  }
}, "transactions");

/** Every transaction, newest first. Balances and lists are calculated from this. */
export const useTransactions = store.use;
export const resetTransactions = store.reset;

export async function createTransaction(input: NewTransaction): Promise<Transaction> {
  const { data, error } = await supabase()
    .from("transactions")
    .insert({
      date: input.date,
      type: input.type,
      amount: input.amount,
      account_id: input.accountId,
      to_account_id: input.toAccountId,
      category_id: input.categoryId,
      note: input.note?.trim().slice(0, NOTE_MAX) || null,
      source: "manual",
    })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  const tx = fromRow(data as Row);
  store.update((list) => [tx, ...list].sort(newestFirst));
  return tx;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase().from("transactions").delete().eq("id", id);
  if (error) throw error;
  store.update((list) => list.filter((t) => t.id !== id));
}
