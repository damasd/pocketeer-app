"use client";

import { useState, type FormEvent } from "react";
import { showToast } from "@/components/toast";
import { Button, ErrorNote, Label } from "@/components/ui";
import type { Category } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import { deleteGoal, saveGoal, type Goal } from "@/lib/goals";
import { localDate } from "@/lib/log";
import { groupThousands, parseRupiahInput } from "@/lib/money";

/** New / edit saving goal: saving category, target amount and target date. */
export function GoalForm({
  goal,
  savingCategories,
  takenCategoryIds,
  onDone,
}: {
  goal: Goal | null;
  savingCategories: Category[];
  takenCategoryIds: string[];
  onDone: () => void;
}) {
  const choices = savingCategories.filter(
    (c) => c.id === goal?.categoryId || (!c.archived && !takenCategoryIds.includes(c.id)),
  );
  const [categoryId, setCategoryId] = useState(goal?.categoryId ?? choices[0]?.id ?? "");
  const [target, setTarget] = useState(goal?.target ?? 0);
  const [date, setDate] = useState(goal?.targetDate ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError(null);
    try {
      await task();
      onDone();
      showToast({ message: done });
    } catch (e) {
      setError(errorMessage(e, "Could not save the goal"));
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!categoryId) return setError("Pick a saving category.");
    if (target <= 0) return setError("Type a target amount.");
    if (!date) return setError("Pick a target date.");
    run(() => saveGoal(goal?.id ?? null, { categoryId, target, targetDate: date }), goal ? "Goal updated" : "Goal added");
  }

  if (!goal && choices.length === 0) {
    return <p className="pb-4 text-center text-[15px] font-medium">Every saving category already has a goal.</p>;
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-category">Saving category</Label>
        <select
          id="goal-category"
          value={categoryId}
          disabled={Boolean(goal)}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-12 rounded-2xl border-0 bg-page px-4 text-base font-semibold disabled:opacity-70"
        >
          {choices.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-target">Target amount</Label>
        <div className="flex h-[52px] items-center gap-1.5 rounded-2xl bg-page px-4">
          <span aria-hidden className="text-[15px] font-semibold text-muted">
            Rp
          </span>
          <input
            id="goal-target"
            inputMode="numeric"
            autoComplete="off"
            value={groupThousands(target)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setTarget(parseRupiahInput(e.target.value))}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base font-semibold outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-date">Target date</Label>
        <input
          id="goal-date"
          type="date"
          min={localDate()}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-12 rounded-2xl border-0 bg-page px-4 text-base font-semibold"
        />
        <p className="text-xs text-muted">The app works out how much to set aside each pay period.</p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button type="submit" disabled={busy} className="mt-2">
        {busy ? "Saving…" : goal ? "Save changes" : "Add goal"}
      </Button>

      {goal &&
        (confirmDelete ? (
          <div role="group" aria-label="Confirm delete" className="flex items-center gap-2 rounded-2xl bg-page p-2 pl-4">
            <span className="flex-1 text-[13px] font-semibold">Delete this goal? Savings stay.</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => run(() => deleteGoal(goal.id), "Goal deleted")}>
              Delete
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="self-center" onClick={() => setConfirmDelete(true)}>
            Delete goal
          </Button>
        ))}
    </form>
  );
}
