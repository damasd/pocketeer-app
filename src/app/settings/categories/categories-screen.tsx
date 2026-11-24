"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { ArchivedSection } from "@/components/archived-section";
import { ArrangeButton, ArrangeList } from "@/components/arrange-list";
import { DeleteCategoryConfirm } from "@/components/delete-category";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import {
  CATEGORY_NAME_MAX,
  CATEGORY_NOTE_MAX,
  createCategory,
  saveCategory,
  setCategoryArchived,
  useCategories,
  type Category,
  type CategoryKind,
} from "@/lib/categories";
import { CATEGORY_ICONS, CategoryIcon, ICON_KEYS } from "@/lib/category-icons";
import { errorMessage } from "@/lib/errors";

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "saving", label: "Saving" },
];

function IconBubble({ icon, size = 44 }: { icon: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center rounded-full bg-page text-ink"
      style={{ width: size, height: size }}
    >
      <CategoryIcon name={icon} size={Math.round(size * 0.45)} />
    </span>
  );
}

export function CategoriesScreen() {
  const state = useCategories();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  // Arrange mode for the type on show (order and archive right in the list).
  const [arrangingKind, setArrangingKind] = useState<CategoryKind | null>(null);
  const arranging = arrangingKind === kind;

  const all = state.data ?? [];
  const ofKind = all.filter((c) => c.kind === kind);
  const active = ofKind.filter((c) => !c.archived);
  const archived = ofKind.filter((c) => c.archived);
  const nextSortOrder = Math.max(0, ...ofKind.map((c) => c.sortOrder)) + 1;
  const loading = state.status === "loading" && !state.data;
  const kindLabel = KINDS.find((k) => k.value === kind)!.label.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between pt-3">
        <div className="flex items-center gap-1">
          <Link href="/settings" aria-label="Back to Settings" className="-ml-2.5 flex size-11 items-center justify-center rounded-full">
            <ChevronLeft aria-hidden size={26} strokeWidth={2.25} />
          </Link>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Categories</h1>
        </div>
        <button
          type="button"
          aria-label={`Add ${kindLabel} category`}
          onClick={() => setEditing("new")}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-card"
        >
          <Plus aria-hidden size={18} strokeWidth={2.25} />
        </button>
      </header>

      <Segmented label="Category type" options={KINDS} value={kind} onChange={setKind} />

      {state.status === "error" && <ErrorNote>{state.message}</ErrorNote>}

      <div className="-mb-3 flex items-center justify-between gap-2">
        <p className="text-[13px] text-muted">{arranging ? "Move with the arrows, or archive" : "Tap a category to edit it"}</p>
        {active.length > 0 && (
          <ArrangeButton
            on={arranging}
            onToggle={() => setArrangingKind(arranging ? null : kind)}
            what={`${kindLabel} categories`}
          />
        )}
      </div>

      {arranging ? (
        <ArrangeList items={active} empty={`No ${kindLabel} categories.`} />
      ) : (
        <ul aria-label={`${KINDS.find((k) => k.value === kind)!.label} categories`} className="flex flex-col overflow-hidden rounded-3xl bg-card">
          {loading &&
            [0, 1, 2, 3].map((i) => (
              <li key={i} aria-hidden className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                <span className="size-11 rounded-full bg-page" />
                <span className="h-4 w-32 rounded bg-page" />
              </li>
            ))}
          {active.map((c) => (
            <CategoryRow key={c.id} category={c} onOpen={() => setEditing(c)} />
          ))}
          {!loading && active.length === 0 && (
            <li className="px-5 py-4 text-[13px] font-medium text-muted">No {kindLabel} categories. Tap + to add one.</li>
          )}
        </ul>
      )}

      <ArchivedSection key={kind} count={archived.length}>
        <ul aria-label={`Archived ${kindLabel} categories`} className="flex flex-col overflow-hidden rounded-3xl bg-card">
          {archived.map((c) => (
            <CategoryRow key={c.id} category={c} onOpen={() => setEditing(c)} />
          ))}
        </ul>
      </ArchivedSection>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? `New ${kindLabel} category` : "Edit category"}
      >
        <CategoryForm
          key={editing === "new" ? `new-${kind}` : editing?.id}
          kind={kind}
          category={editing === "new" ? null : editing}
          nextSortOrder={nextSortOrder}
          onDone={() => setEditing(null)}
        />
      </Sheet>
    </div>
  );
}

function CategoryRow({ category, onOpen }: { category: Category; onOpen: () => void }) {
  return (
    <li className="border-b border-line last:border-0">
      <button type="button" onClick={onOpen} className="flex min-h-16 w-full items-center gap-3 px-5 py-3 text-left">
        <IconBubble icon={category.icon} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold">{category.name}</span>
          {category.note && <span className="truncate text-[13px] font-medium text-muted">{category.note}</span>}
        </span>
        <ChevronRight aria-hidden size={20} className="flex-none text-muted" />
      </button>
    </li>
  );
}

function CategoryForm({
  kind,
  category,
  nextSortOrder,
  onDone,
}: {
  kind: CategoryKind;
  category: Category | null;
  nextSortOrder: number;
  onDone: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [note, setNote] = useState(category?.note ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "ellipsis");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const trimmed = name.trim();
  const nameMissing = tried && !trimmed;

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      onDone();
    } catch (e) {
      setError(errorMessage(e, "Could not save the category"));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!trimmed) return;
    const input = { name: trimmed, note, icon };
    run(() => (category ? saveCategory(category.id, input) : createCategory(kind, input, nextSortOrder)));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-3xl bg-page p-4">
        <span aria-hidden className="flex size-12 flex-none items-center justify-center rounded-full bg-card">
          <CategoryIcon name={icon} size={22} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className={`truncate text-[17px] font-bold ${trimmed ? "" : "text-muted"}`}>{trimmed || "Category name"}</span>
          {note.trim() && <span className="truncate text-[13px] font-medium text-muted">{note.trim()}</span>}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          placeholder="e.g. Groceries"
          maxLength={CATEGORY_NAME_MAX}
          autoComplete="off"
          value={name}
          aria-invalid={nameMissing}
          onChange={(e) => setName(e.target.value)}
          className={`bg-page ${nameMissing ? "ring-2 ring-ember ring-inset" : ""}`}
        />
        {nameMissing && (
          <p className="self-start rounded-full bg-ember px-3 py-1 text-[13px] font-semibold text-white">Give the category a name first</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category-note">Note (optional)</Label>
        <Input
          id="category-note"
          placeholder="e.g. Weekly supermarket run"
          maxLength={CATEGORY_NOTE_MAX}
          autoComplete="off"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-page"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">Icon</span>
        <div role="group" aria-label="Category icon" className="grid grid-cols-6 gap-1.5">
          {ICON_KEYS.map((key) => {
            const Icon = CATEGORY_ICONS[key];
            const on = key === icon;
            return (
              <button
                key={key}
                type="button"
                aria-label={key.replace(/-/g, " ")}
                aria-pressed={on}
                onClick={() => setIcon(key)}
                className={`flex aspect-square min-h-11 items-center justify-center rounded-full transition-colors duration-150 ${
                  on ? "bg-lime text-ink" : "bg-page text-ink"
                }`}
              >
                <Icon aria-hidden size={20} strokeWidth={2} />
              </button>
            );
          })}
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button type="submit" disabled={busy} className="mt-2">
        {busy ? "Saving…" : category ? "Save changes" : "Create category"}
      </Button>
      {category && (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => run(() => setCategoryArchived(category.id, !category.archived))}
        >
          {category.archived ? "Restore category" : "Archive category"}
        </Button>
      )}
      {category &&
        !category.builtIn &&
        (confirmDelete ? (
          <DeleteCategoryConfirm category={category} onCancel={() => setConfirmDelete(false)} onDone={onDone} />
        ) : (
          <Button type="button" variant="ghost" size="sm" className="self-center" onClick={() => setConfirmDelete(true)}>
            Delete category
          </Button>
        ))}
    </form>
  );
}
