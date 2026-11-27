"use client";

import { Archive, ArrowDown, ArrowDownUp, ArrowUp, Check } from "lucide-react";
import { showToast } from "@/components/toast";
import { reorderCategories, setCategoryArchived, type Category } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";

/** "Arrange" / "Done" switch for a list of categories; `icon` makes it a round icon button. */
export function ArrangeButton({
  on,
  onToggle,
  what,
  icon = false,
}: {
  on: boolean;
  onToggle: () => void;
  what: string;
  icon?: boolean;
}) {
  if (icon)
    return (
      <button
        type="button"
        aria-pressed={on}
        aria-label={on ? `Done arranging ${what}` : `Arrange ${what}`}
        onClick={onToggle}
        // 32 px circle; the tap area still reaches 44 px around it.
        className={`relative flex size-8 flex-none items-center justify-center rounded-full transition-colors duration-150 after:absolute after:-inset-1.5 after:content-[""] ${
          on ? "bg-ink text-white" : "bg-card text-ink ring-1 ring-line ring-inset"
        }`}
      >
        {on ? <Check aria-hidden size={15} strokeWidth={2.5} /> : <ArrowDownUp aria-hidden size={15} strokeWidth={2.25} />}
      </button>
    );
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Done arranging ${what}` : `Arrange ${what}`}
      onClick={onToggle}
      className={`flex h-11 flex-none items-center rounded-full px-4 text-meta font-bold transition-colors duration-150 ${
        on ? "bg-ink text-white" : "bg-card text-ink ring-1 ring-line ring-inset"
      }`}
    >
      {on ? "Done" : "Arrange"}
    </button>
  );
}

/**
 * The categories of one kind with ↑ ↓ to change their order and a button to archive one (with
 * Undo). The same order shows everywhere: Plan, Goals, the Log sheet and Settings › Categories.
 */
export function ArrangeList({ items, empty }: { items: Category[]; empty: string }) {
  const ids = items.map((c) => c.id);

  async function move(i: number, by: -1 | 1) {
    const j = i + by;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    try {
      await reorderCategories(next);
    } catch (e) {
      showToast({ message: errorMessage(e, "Could not save the order"), tone: "error" });
    }
  }

  async function archive(c: Category) {
    try {
      await setCategoryArchived(c.id, true);
      showToast({
        message: `${c.name} archived`,
        action: {
          label: "Undo",
          run: async () => {
            try {
              await setCategoryArchived(c.id, false);
            } catch (e) {
              showToast({ message: errorMessage(e, "Could not undo"), tone: "error" });
            }
          },
        },
      });
    } catch (e) {
      showToast({ message: errorMessage(e, "Could not archive"), tone: "error" });
    }
  }

  if (!items.length) return <p className="rounded-card bg-card px-5 py-4 text-meta font-medium text-muted">{empty}</p>;

  const iconButton = "flex size-11 flex-none items-center justify-center rounded-full disabled:opacity-30";
  return (
    <ul className="rounded-card bg-card px-2 py-1">
      {items.map((c, i) => (
        <li key={c.id} className={`flex items-center gap-1 py-1 pl-3 ${i ? "border-t border-page" : ""}`}>
          <span className="min-w-0 flex-1 truncate text-body font-semibold">{c.name}</span>
          <button type="button" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)} className={iconButton}>
            <ArrowUp aria-hidden size={18} strokeWidth={2.25} />
          </button>
          <button
            type="button"
            aria-label={`Move ${c.name} down`}
            disabled={i === items.length - 1}
            onClick={() => move(i, 1)}
            className={iconButton}
          >
            <ArrowDown aria-hidden size={18} strokeWidth={2.25} />
          </button>
          <button type="button" aria-label={`Archive ${c.name}`} onClick={() => archive(c)} className={`${iconButton} text-muted`}>
            <Archive aria-hidden size={18} strokeWidth={2} />
          </button>
        </li>
      ))}
    </ul>
  );
}
