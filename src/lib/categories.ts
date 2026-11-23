"use client";

import { createStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

export type CategoryKind = "expense" | "income" | "saving";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  note: string | null;
  sortOrder: number;
  archived: boolean;
};

export type CategoryInput = Pick<Category, "name" | "icon" | "note">;

export const CATEGORY_NAME_MAX = 24;
export const CATEGORY_NOTE_MAX = 60;

type Row = {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string;
  note: string | null;
  sort_order: number;
  archived: boolean;
};

const COLUMNS = "id, name, kind, icon, note, sort_order, archived";

const fromRow = (r: Row): Category => ({
  id: r.id,
  name: r.name,
  kind: r.kind,
  icon: r.icon,
  note: r.note,
  sortOrder: r.sort_order,
  archived: r.archived,
});

const toRow = (input: CategoryInput) => ({
  name: input.name.trim().slice(0, CATEGORY_NAME_MAX),
  icon: input.icon,
  note: input.note?.trim().slice(0, CATEGORY_NOTE_MAX) || null,
});

const store = createStore<Category[]>(async () => {
  const { data, error } = await supabase()
    .from("categories")
    .select(COLUMNS)
    .order("kind")
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}, "categories");

export const useCategories = store.use;
export const resetCategories = store.reset;

function friendly(e: { message?: string; code?: string }) {
  if (e.code === "23505") return new Error("A category with that name already exists here.");
  return new Error(e.message ?? "Could not save the category");
}

export async function createCategory(kind: CategoryKind, input: CategoryInput, sortOrder: number) {
  const { data, error } = await supabase()
    .from("categories")
    .insert({ ...toRow(input), kind, sort_order: sortOrder })
    .select(COLUMNS)
    .single();
  if (error) throw friendly(error);
  const category = fromRow(data as Row);
  store.update((list) => [...list, category]);
  return category;
}

async function patchCategory(id: string, patch: Record<string, unknown>) {
  const { data, error } = await supabase().from("categories").update(patch).eq("id", id).select(COLUMNS).single();
  if (error) throw friendly(error);
  const category = fromRow(data as Row);
  store.update((list) => list.map((c) => (c.id === id ? category : c)));
  return category;
}

export function saveCategory(id: string, input: CategoryInput) {
  return patchCategory(id, toRow(input));
}

export function setCategoryArchived(id: string, archived: boolean) {
  return patchCategory(id, { archived });
}
