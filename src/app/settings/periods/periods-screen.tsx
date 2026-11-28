"use client";

import { SubHeader } from "@/components/screen";
import { useState, type FormEvent } from "react";
import { ChevronRight } from "lucide-react";
import { Sheet } from "@/components/sheet";
import { showToast } from "@/components/toast";
import { Button, ErrorNote, Label } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { dateLabel } from "@/lib/log";
import { periodRangeLabel, startDayLimits } from "@/lib/periods";
import { setPeriodStart, usePeriods, type StoredPeriod } from "@/lib/periods-store";
import { useToday } from "@/lib/use-today";

/** Settings > Pay periods: list periods; change a start day by hand for holidays. */
export function PeriodsScreen() {
  const periods = usePeriods();
  const [editing, setEditing] = useState<StoredPeriod | null>(null);
  const list = periods.data ?? []; // newest first
  const today = useToday();

  return (
    <div className="flex flex-col gap-6">
      <SubHeader title="Pay periods" back="/settings" backLabel="Back to Settings" />

      <p className="text-meta font-medium text-muted">
        A period starts on the 25th, or the next Monday when the 25th is a weekend, and is named after the month it ends
        in. Public holidays aren&apos;t detected: tap a period to move its start day.
      </p>

      {periods.status === "error" && <ErrorNote>{periods.message}</ErrorNote>}

      <ul className="flex flex-col overflow-hidden rounded-card bg-card">
        {periods.status === "loading" && !periods.data && (
          <li className="px-5 py-4 text-meta text-muted">Loading…</li>
        )}
        {list.map((p) => (
          <li key={p.id} className="border-b border-line last:border-0">
            <button type="button" onClick={() => setEditing(p)} className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body font-semibold">
                  {p.name}
                  {today && today >= p.start && today <= p.end && (
                    <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-caption font-semibold text-on-accent">Now</span>
                  )}
                </span>
                <span className="text-meta font-medium text-muted">{periodRangeLabel(p)}</span>
              </span>
              <ChevronRight aria-hidden size={20} className="flex-none text-muted" />
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing ? `${editing.name} period` : "Period"}>
        {editing && (
          <StartForm
            key={editing.id}
            period={editing}
            prev={list[list.indexOf(editing) + 1] ?? null}
            next={list[list.indexOf(editing) - 1] ?? null}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function StartForm({
  period,
  prev,
  next,
  onDone,
}: {
  period: StoredPeriod;
  prev: StoredPeriod | null;
  next: StoredPeriod | null;
  onDone: () => void;
}) {
  const [start, setStart] = useState(period.start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const limits = startDayLimits(period.start, prev?.start ?? null, next?.start ?? null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (start < limits.min || start > limits.max) {
      return setError(`Pick a day from ${dateLabel(limits.min)} to ${dateLabel(limits.max)}.`);
    }
    if (start === period.start) return onDone();
    setBusy(true);
    setError(null);
    try {
      await setPeriodStart(period.id, start);
      onDone();
      showToast({ message: `${period.name} now starts ${dateLabel(start)}` });
    } catch (err) {
      setError(errorMessage(err, "Could not change the period"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-body font-medium">
        {periodRangeLabel(period)}
        {prev && <span className="text-muted"> · {prev.name} ends the day before</span>}
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="period-start">Start day</Label>
        <input
          id="period-start"
          type="date"
          min={limits.min}
          max={limits.max}
          value={start}
          onChange={(e) => e.target.value && setStart(e.target.value)}
          className="h-12 rounded-tile border-0 bg-page px-4 text-input font-semibold"
        />
        <p className="text-caption text-muted">Stays within this month. Budgets and transactions follow the new dates.</p>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save start day"}
      </Button>
    </form>
  );
}
