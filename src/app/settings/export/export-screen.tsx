"use client";

import { SubHeader } from "@/components/screen";
import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { showToast } from "@/components/toast";
import { ErrorNote, Label } from "@/components/ui";
import { useAccounts } from "@/lib/accounts";
import { useCategories } from "@/lib/categories";
import { errorMessage } from "@/lib/errors";
import { HEADERS, exportFileName, exportRows, safeText, toCsv } from "@/lib/export";
import { periodFor, periodRangeLabel } from "@/lib/periods";
import { coverPeriodsFrom, periodOf, usePeriods } from "@/lib/periods-store";
import { useTransactions } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";

const ALL = "all";

/** iPhone/iPad: hand the file to the share sheet (Save to Files); elsewhere, a normal download. */
async function saveFile(blob: Blob, name: string) {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
  const file = new File([blob], name, { type: blob.type });
  if (ios && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // closed the share sheet
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Settings > Export: transactions for one pay period or all time, as .xlsx or .csv. */
export function ExportScreen() {
  const today = useToday();
  const transactions = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const periods = usePeriods();
  const [scope, setScope] = useState<string | null>(null); // period start, ALL, or null = current
  const [busy, setBusy] = useState<"csv" | "xlsx" | null>(null);

  const txs = useMemo(() => transactions.data ?? [], [transactions.data]);
  const oldest = txs.length ? txs[txs.length - 1].date : null;
  useEffect(() => {
    coverPeriodsFrom(oldest);
  }, [oldest]);

  const choices = (periods.data ?? []).filter((p) => !today || p.start <= today);
  const current = today ? periodOf(choices, today) : null;
  const selectedKey = scope ?? current?.start ?? ALL;
  const period = selectedKey === ALL ? null : (choices.find((p) => p.start === selectedKey) ?? null);
  const selected = period ? txs.filter((t) => t.date >= period.start && t.date <= period.end) : txs;

  const periodName = (date: string) => (periodOf(choices, date) ?? periodFor(date)).name;
  const names = {
    account: (id: string | null) => (accounts.data ?? []).find((a) => a.id === id)?.name ?? "",
    category: (id: string | null) => (categories.data ?? []).find((c) => c.id === id)?.name ?? "",
    period: periodName,
  };
  const ready = transactions.status === "ready" && accounts.status === "ready" && categories.status === "ready";
  const loadError = [transactions, accounts, categories, periods].find((s) => s.status === "error");
  const fileScope = period ? { name: period.name, year: period.end.slice(0, 4) } : null;

  async function run(kind: "csv" | "xlsx") {
    setBusy(kind);
    try {
      const rows = exportRows(selected, names);
      const name = exportFileName(fileScope, kind);
      if (kind === "csv") {
        await saveFile(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }), name);
      } else {
        const XLSX = await import("xlsx");
        const sheet = XLSX.utils.aoa_to_sheet([
          HEADERS,
          ...rows.map((r) => r.map((v) => (typeof v === "string" ? safeText(v) : v))),
        ]);
        sheet["!cols"] = [12, 16, 14, 20, 16, 16, 32, 16, 10].map((wch) => ({ wch }));
        // Amount column: whole rupiah with thousands separators.
        for (let r = 1; r <= rows.length; r++) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c: 2 })];
          if (cell) cell.z = "#,##0";
        }
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, "Transactions");
        const data = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
        await saveFile(
          new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          name,
        );
      }
    } catch (e) {
      showToast({ message: errorMessage(e, "Could not export"), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SubHeader title="Export" back="/settings" backLabel="Back to Settings" />

      {loadError && loadError.status === "error" && <ErrorNote>{loadError.message}</ErrorNote>}

      <section className="flex flex-col gap-4 rounded-card bg-card p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="export-scope">Transactions from</Label>
          <select
            id="export-scope"
            value={selectedKey}
            onChange={(e) => setScope(e.target.value)}
            className="h-12 rounded-tile border-0 bg-page px-4 text-input font-semibold"
          >
            {choices.map((p) => (
              <option key={p.start} value={p.start}>
                {p.name} ({periodRangeLabel(p)})
              </option>
            ))}
            <option value={ALL}>All time</option>
          </select>
        </div>
        <p className="text-meta font-medium text-muted" aria-live="polite">
          {ready
            ? `${selected.length} ${selected.length === 1 ? "transaction" : "transactions"} · one row each, oldest first`
            : "Loading…"}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!ready || busy !== null || selected.length === 0}
            onClick={() => run("xlsx")}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-body font-bold text-on-accent disabled:opacity-50"
          >
            <FileSpreadsheet aria-hidden size={20} strokeWidth={2} />
            {busy === "xlsx" ? "Preparing…" : "Download .xlsx"}
          </button>
          <button
            type="button"
            disabled={!ready || busy !== null || selected.length === 0}
            onClick={() => run("csv")}
            className="flex h-14 items-center justify-center gap-2 rounded-full bg-card text-body font-bold text-ink ring-1 ring-line ring-inset disabled:opacity-50"
          >
            <FileText aria-hidden size={20} strokeWidth={2} />
            {busy === "csv" ? "Preparing…" : "Download .csv"}
          </button>
        </div>
        <p className="text-caption text-muted">
          Columns: {HEADERS.join(", ")}. On iPhone the share sheet opens; choose Save to Files.
        </p>
      </section>
    </div>
  );
}
