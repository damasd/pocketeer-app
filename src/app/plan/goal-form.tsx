"use client";

import { useState, type FormEvent } from "react";
import { DeleteCategoryConfirm } from "@/components/delete-category";
import { showToast } from "@/components/toast";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import { CATEGORY_NAME_MAX, createCategory, saveCategory, type Category } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import { deleteGoal, saveGoal, type Goal } from "@/lib/goals";
import { localDate } from "@/lib/log";
import { formatRupiah, groupThousands, parseRupiahInput } from "@/lib/money";

/**
 * A goal is a saving category (same thing, same name in the Log sheet), with an optional
 * target amount and date. New goal = new saving category. Archive one in Settings > Categories.
 */
export function GoalForm({
  category,
  goal,
  nextSortOrder,
  balance = 0,
  onDone,
}: {
  category: Category | null;
  goal: Goal | null;
  nextSortOrder: number;
  /** Current saving balance; a goal can be deleted only at Rp 0. */
  balance?: number;
  onDone: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [target, setTarget] = useState(goal?.target ?? 0);
  const [date, setDate] = useState(goal?.targetDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      onDone();
    } catch (e) {
      setError(errorMessage(e, "Could not save the goal"));
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the goal a name.");
    if (date && target <= 0) return setError("Type a target amount, or clear the date.");

    run(async () => {
      let c = category;
      if (!c) {
        c = await createCategory("saving", { name: trimmed, icon: "piggy-bank", note: null }, nextSortOrder);
      } else if (trimmed !== c.name) {
        c = await saveCategory(c.id, { name: trimmed, icon: c.icon, note: c.note });
      }
      if (target > 0) await saveGoal(goal?.id ?? null, { categoryId: c.id, target, targetDate: date || null });
      else if (goal) await deleteGoal(goal.id);
      showToast({ message: category ? "Goal updated" : `${trimmed} added` });
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-name">Name</Label>
        <Input
          id="goal-name"
          placeholder="e.g. New laptop"
          maxLength={CATEGORY_NAME_MAX}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-page"
        />
        <p className="text-xs text-muted">This is also the saving category you pick in the Log sheet.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="goal-target">Target amount (optional)</Label>
        <div className="flex h-[52px] items-center gap-1.5 rounded-2xl bg-page px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime">
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
        <Label htmlFor="goal-date">Target date (optional)</Label>
        <div className="flex items-center gap-2">
          <input
            id="goal-date"
            type="date"
            min={localDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-2xl border-0 bg-page px-4 text-base font-semibold"
          />
          {date && (
            <button
              type="button"
              onClick={() => setDate("")}
              className="h-12 flex-none rounded-2xl bg-page px-4 text-sm font-semibold"
            >
              Clear date
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          With a date, the app suggests how much to set aside each pay period. Without one, it just tracks progress.
        </p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button type="submit" disabled={busy} className="mt-2">
        {busy ? "Saving…" : category ? "Save changes" : "Add goal"}
      </Button>

      {category &&
        (balance !== 0 ? (
          <p className="rounded-2xl bg-page px-4 py-3 text-center text-[13px] font-medium text-muted">
            {formatRupiah(balance)} is still saved here. Withdraw it to a Spending account before deleting this goal.
          </p>
        ) : confirmDelete ? (
          <DeleteCategoryConfirm category={category} onCancel={() => setConfirmDelete(false)} onDone={onDone} />
        ) : (
          <Button type="button" variant="ghost" size="sm" className="self-center" onClick={() => setConfirmDelete(true)}>
            Delete goal
          </Button>
        ))}
    </form>
  );
}
