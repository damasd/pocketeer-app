"use client";

import { localDate } from "@/lib/log";
import { buildPeriods, missingStarts, nextRuleStart, periodFor, type Period } from "@/lib/periods";
import { createStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

export type StoredPeriod = Period & { id: string };

type Row = { id: string; start_date: string; end_date: string; name: string };

/** Earliest date the periods must cover (set from the oldest transaction once it is known). */
let coverFrom: string | null = null;

async function fetchRows(): Promise<Row[]> {
  const { data, error } = await supabase().from("periods").select("id, start_date, end_date, name").order("start_date");
  if (error) throw error;
  return data as Row[];
}

/**
 * Load periods, add any the 25th rule says are missing (from the oldest transaction to today),
 * and keep each row's end date and name in step with the next period's start.
 */
async function load(): Promise<StoredPeriod[]> {
  let rows = await fetchRows();
  const today = localDate();
  const from = coverFrom && coverFrom < today ? coverFrom : today;

  // Through the next period too, so next month can be planned ahead.
  const to = nextRuleStart(periodFor(today).start);
  const toAdd = missingStarts(
    rows.map((r) => r.start_date),
    from,
    to,
  );
  if (toAdd.length) {
    const built = buildPeriods([...rows.map((r) => r.start_date), ...toAdd]);
    const inserts = built.filter((p) => toAdd.includes(p.start)).map((p) => ({ start_date: p.start, end_date: p.end, name: p.name }));
    const { error } = await supabase().from("periods").upsert(inserts, { onConflict: "user_id,start_date", ignoreDuplicates: true });
    if (error) throw error;
    rows = await fetchRows();
  }

  const built = buildPeriods(rows.map((r) => r.start_date));
  const byStart = new Map(rows.map((r) => [r.start_date, r]));
  const stale = built.filter((p) => {
    const r = byStart.get(p.start)!;
    return r.end_date !== p.end || r.name !== p.name;
  });
  for (const p of stale) {
    const { error } = await supabase().from("periods").update({ end_date: p.end, name: p.name }).eq("id", byStart.get(p.start)!.id);
    if (error) throw error;
  }

  return built.map((p) => ({ ...p, id: byStart.get(p.start)!.id }));
}

const store = createStore<StoredPeriod[]>(load, "pay periods");

/** Pay periods, newest first. */
export const usePeriods = store.use;
export const resetPeriods = () => {
  coverFrom = null;
  store.reset();
};

/** Make sure periods reach back to `date` (e.g. the oldest transaction). */
export async function coverPeriodsFrom(date: string | null) {
  if (!date || (coverFrom && coverFrom <= date)) return;
  coverFrom = date;
  await store.refresh();
}

/** Move a period's start day (for a holiday). The previous period's end follows on reload. */
export async function setPeriodStart(id: string, start: string) {
  const { error } = await supabase().from("periods").update({ start_date: start }).eq("id", id);
  if (error) throw error;
  await store.refresh();
}

/** The stored period containing a date, if any. */
export function periodOf(periods: readonly StoredPeriod[], date: string): StoredPeriod | null {
  return periods.find((p) => date >= p.start && date <= p.end) ?? null;
}
