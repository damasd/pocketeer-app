"use client";

import { createStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

export type Budget = { id: string; categoryId: string; periodId: string; amount: number };

type Row = { id: string; category_id: string; period_id: string; amount: number };

const COLUMNS = "id, category_id, period_id, amount";
const fromRow = (r: Row): Budget => ({ id: r.id, categoryId: r.category_id, periodId: r.period_id, amount: Number(r.amount) });

const store = createStore<Budget[]>(async () => {
  const { data, error } = await supabase().from("budgets").select(COLUMNS);
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}, "budgets");

export const useBudgets = store.use;
export const resetBudgets = store.reset;

/** Set (or change) one category's amount for one period. */
export async function setBudget(periodId: string, categoryId: string, amount: number): Promise<Budget> {
  const { data, error } = await supabase()
    .from("budgets")
    .upsert(
      { period_id: periodId, category_id: categoryId, amount, updated_at: new Date().toISOString() },
      { onConflict: "period_id,category_id" },
    )
    .select(COLUMNS)
    .single();
  if (error) throw error;
  const b = fromRow(data as Row);
  store.update((list) => [...list.filter((x) => !(x.periodId === periodId && x.categoryId === categoryId)), b]);
  return b;
}

/**
 * Copy every amount from one period into another (overwriting what is there).
 * Returns an undo step that puts the target period back as it was.
 */
export async function copyBudgets(all: readonly Budget[], fromPeriodId: string, toPeriodId: string): Promise<() => Promise<void>> {
  const before = all.filter((b) => b.periodId === toPeriodId);
  const source = all.filter((b) => b.periodId === fromPeriodId);
  const rows = source.map((b) => ({
    period_id: toPeriodId,
    category_id: b.categoryId,
    amount: b.amount,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await supabase().from("budgets").upsert(rows, { onConflict: "period_id,category_id" });
    if (error) throw error;
  }
  await store.refresh();

  return async () => {
    const copiedIds = new Set(source.map((b) => b.categoryId));
    const keep = new Set(before.map((b) => b.categoryId));
    const toDelete = [...copiedIds].filter((id) => !keep.has(id));
    if (before.length) {
      const { error } = await supabase()
        .from("budgets")
        .upsert(
          before.map((b) => ({ period_id: toPeriodId, category_id: b.categoryId, amount: b.amount })),
          { onConflict: "period_id,category_id" },
        );
      if (error) throw error;
    }
    if (toDelete.length) {
      const { error } = await supabase().from("budgets").delete().eq("period_id", toPeriodId).in("category_id", toDelete);
      if (error) throw error;
    }
    await store.refresh();
  };
}
