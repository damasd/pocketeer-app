"use client";

import { createStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

/**
 * Which expense categories show their budget tile on Home (categories.home_tile, picked on the
 * Budget page). Kept apart from the categories list so that, before the migration
 * 20261126000000_category_home_tile.sql has been run, the rest of the app still loads: then
 * nothing is chosen and Home shows its automatic pick.
 */
let missingColumn = false;

const store = createStore<string[]>(async () => {
  const { data, error } = await supabase().from("categories").select("id").eq("home_tile", true);
  if (error) {
    // Column not there yet (undefined_column).
    if (error.code === "42703" || /home_tile/.test(error.message ?? "")) {
      missingColumn = true;
      return [];
    }
    throw error;
  }
  missingColumn = false;
  return (data as { id: string }[]).map((r) => r.id);
}, "Home tiles");

export const useHomeTiles = store.use;
export const resetHomeTiles = store.reset;

/** Show (or stop showing) a category's tile on Home. */
export async function setHomeTile(categoryId: string, on: boolean) {
  if (missingColumn) {
    throw new Error("Run the latest database update in Supabase first (category_home_tile).");
  }
  store.update((ids) => (on ? [...ids.filter((id) => id !== categoryId), categoryId] : ids.filter((id) => id !== categoryId)));
  const { error } = await supabase().from("categories").update({ home_tile: on }).eq("id", categoryId);
  if (error) {
    await store.refresh(); // put back what is really saved
    throw new Error(error.message || "Could not save your choice");
  }
}
