"use client";

import { useState } from "react";
import { showToast } from "@/components/toast";
import { Button } from "@/components/ui";
import { deleteCategory, setCategoryArchived, type Category } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";

/**
 * Confirm deleting a category you added. If it has transactions, deleting is blocked
 * and archiving is offered instead (hidden from lists, history kept).
 */
export function DeleteCategoryConfirm({
  category,
  onCancel,
  onDone,
}: {
  category: Category;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    try {
      await deleteCategory(category.id);
      onDone();
      showToast({ message: `${category.name} deleted` });
    } catch (e) {
      setBlocked(errorMessage(e, "Could not delete"));
      setBusy(false);
    }
  }

  async function archive() {
    setBusy(true);
    try {
      await setCategoryArchived(category.id, true);
      onDone();
      showToast({
        message: `${category.name} archived`,
        action: {
          label: "Undo",
          run: async () => {
            try {
              await setCategoryArchived(category.id, false);
            } catch (e) {
              showToast({ message: errorMessage(e, "Could not undo"), tone: "error" });
            }
          },
        },
      });
    } catch (e) {
      setBlocked(errorMessage(e, "Could not archive"));
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-label={`Delete ${category.name}`} className="flex flex-col gap-2 rounded-2xl bg-page p-4">
      {blocked ? (
        <>
          <p className="text-[15px] font-semibold">Can&apos;t delete {category.name}</p>
          <p className="text-[13px] font-medium text-muted">{blocked}</p>
          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" size="md" className="flex-1" disabled={busy} onClick={archive}>
              {busy ? "Archiving…" : "Archive instead"}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold">Delete {category.name}?</p>
          <p className="text-[13px] font-medium text-muted">
            Its budget amounts{category.kind === "saving" ? " and goal" : ""} are deleted too. This can&apos;t be undone.
          </p>
          <div className="mt-1 flex gap-2">
            <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="md" className="flex-1" disabled={busy} onClick={remove}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
