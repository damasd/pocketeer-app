import { describe, expect, it } from "vitest";
import { exportFileName, exportRows, safeText, toCsv } from "./export";

const names = {
  account: (id: string | null) => ({ bca: "BCA", gopay: "GoPay" })[id ?? ""] ?? "",
  category: (id: string | null) => ({ food2: "Food 2" })[id ?? ""] ?? "",
  period: () => "December",
};

describe("exportRows", () => {
  it("makes one row per transaction, oldest first, with readable names", () => {
    const rows = exportRows(
      [
        { date: "2026-12-05", type: "transfer", amount: 200000, accountId: "bca", toAccountId: "gopay", categoryId: null, note: null, source: "manual" },
        { date: "2026-12-01", type: "expense", amount: 35000, accountId: "gopay", toAccountId: null, categoryId: "food2", note: "Nasi padang", source: "manual" },
      ],
      names,
    );
    expect(rows).toEqual([
      ["2026-12-01", "Expense", 35000, "Food 2", "GoPay", "", "Nasi padang", "December", "manual"],
      ["2026-12-05", "Transfer", 200000, "", "BCA", "GoPay", "", "December", "manual"],
    ]);
  });
});

describe("safeText", () => {
  it("defuses cells that would run as formulas", () => {
    expect(safeText("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeText("+62")).toBe("'+62");
    expect(safeText("@me")).toBe("'@me");
    expect(safeText("Nasi padang")).toBe("Nasi padang");
  });
});

describe("toCsv", () => {
  it("adds a header and BOM, quotes commas and quotes, keeps amounts as numbers", () => {
    const csv = toCsv([["2026-12-01", "Expense", 35000, "Food 2", "GoPay", "", 'Lunch, "big"', "December", "manual"]]);
    expect(csv.startsWith("﻿Date,Type,Amount,")).toBe(true);
    expect(csv).toContain('2026-12-01,Expense,35000,Food 2,GoPay,,"Lunch, ""big""",December,manual\r\n');
  });

  it("defuses formula-looking notes", () => {
    const csv = toCsv([["2026-12-01", "Expense", 1, "", "", "", "=cmd", "", "manual"]]);
    expect(csv).toContain(",'=cmd,");
  });
});

describe("exportFileName", () => {
  it("names files after the period or all time", () => {
    expect(exportFileName({ name: "December", year: "2026" }, "csv")).toBe("money-december-2026.csv");
    expect(exportFileName({ name: "December 2025", year: "2025" }, "xlsx")).toBe("money-december-2025.xlsx");
    expect(exportFileName(null, "xlsx")).toBe("money-all-time.xlsx");
  });
});
