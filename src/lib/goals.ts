"use client";

import { createStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

export type Goal = { id: string; categoryId: string; target: number; targetDate: string };
export type GoalInput = Omit<Goal, "id">;

type Row = { id: string; category_id: string; target_amount: number; target_date: string };

const COLUMNS = "id, category_id, target_amount, target_date";
const fromRow = (r: Row): Goal => ({
  id: r.id,
  categoryId: r.category_id,
  target: Number(r.target_amount),
  targetDate: r.target_date,
});

const store = createStore<Goal[]>(async () => {
  const { data, error } = await supabase().from("goals").select(COLUMNS).order("target_date");
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}, "goals");

export const useGoals = store.use;
export const resetGoals = store.reset;

const toRow = (g: GoalInput) => ({ category_id: g.categoryId, target_amount: g.target, target_date: g.targetDate });

export async function saveGoal(id: string | null, input: GoalInput): Promise<Goal> {
  const query = id
    ? supabase().from("goals").update(toRow(input)).eq("id", id)
    : supabase().from("goals").insert(toRow(input));
  const { data, error } = await query.select(COLUMNS).single();
  if (error) {
    if (error.code === "23505") throw new Error("That saving category already has a goal.");
    throw error;
  }
  const goal = fromRow(data as Row);
  store.update((list) => [...list.filter((g) => g.id !== goal.id), goal]);
  return goal;
}

export async function deleteGoal(id: string) {
  const { error } = await supabase().from("goals").delete().eq("id", id);
  if (error) throw error;
  store.update((list) => list.filter((g) => g.id !== id));
}
