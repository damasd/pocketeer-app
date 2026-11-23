import { describe, expect, it } from "vitest";
import { NO_FILTER, filterHistory, groupByDay, matchesType, signedAmount, type HistoryItem } from "./history";

const tx = (over: Partial<HistoryItem>): HistoryItem => ({
  id: Math.random().toString(36),
  date: "2026-12-07",
  createdAt: "2026-12-07T05:00:00Z",
  type: "expense",
  amount: 35000,
  accountId: "gopay",
  toAccountId: null,
  categoryId: "food2",
  note: null,
  ...over,
});

const names = {
  account: (id: string | null) => ({ gopay: "GoPay", bca: "BCA", jago: "Jago" })[id ?? ""] ?? "",
  category: (id: string | null) => ({ food2: "Food 2", salary: "Salary", gold: "Gold" })[id ?? ""] ?? "",
};

describe("matchesType", () => {
  it("treats deposits and withdrawals as saving", () => {
    expect(matchesType("saving_deposit", "saving")).toBe(true);
    expect(matchesType("saving_withdraw", "saving")).toBe(true);
    expect(matchesType("expense", "saving")).toBe(false);
    expect(matchesType("income", "all")).toBe(true);
  });
});

describe("filterHistory", () => {
  const items = [
    tx({ id: "a", note: "Nasi padang" }),
    tx({ id: "b", date: "2026-11-25", type: "income", accountId: "bca", categoryId: "salary", note: null }),
    tx({ id: "c", type: "transfer", accountId: "bca", toAccountId: "gopay", categoryId: null }),
    tx({ id: "d", date: "2026-11-20", type: "saving_deposit", accountId: "jago", toAccountId: "jago", categoryId: "gold" }),
  ];
  const ids = (f: Partial<typeof NO_FILTER>) => filterHistory(items, { ...NO_FILTER, ...f }, names).map((t) => t.id);

  it("returns everything with no filter", () => {
    expect(ids({})).toEqual(["a", "b", "c", "d"]);
  });

  it("filters by period, inclusive", () => {
    expect(ids({ period: { start: "2026-11-25", end: "2026-12-24" } })).toEqual(["a", "b", "c"]);
  });

  it("matches an account on either side of a transfer", () => {
    expect(ids({ accountId: "gopay" })).toEqual(["a", "c"]);
    expect(ids({ accountId: "bca" })).toEqual(["b", "c"]);
  });

  it("filters by category and type", () => {
    expect(ids({ categoryId: "salary" })).toEqual(["b"]);
    expect(ids({ type: "saving" })).toEqual(["d"]);
    expect(ids({ type: "expense" })).toEqual(["a"]);
  });

  it("searches note, category and account names, ignoring case", () => {
    expect(ids({ query: "padang" })).toEqual(["a"]);
    expect(ids({ query: "salary" })).toEqual(["b"]);
    expect(ids({ query: "JAGO" })).toEqual(["d"]);
  });
});

describe("groupByDay", () => {
  it("groups newest day first and newest entry first", () => {
    const groups = groupByDay(
      [
        tx({ id: "old", date: "2026-12-05" }),
        tx({ id: "early", date: "2026-12-07", createdAt: "2026-12-07T01:00:00Z" }),
        tx({ id: "late", date: "2026-12-07", createdAt: "2026-12-07T09:00:00Z" }),
      ],
      "2026-12-07",
    );
    expect(groups.map((g) => g.label)).toEqual(["Today", "Sat, 5 Dec"]);
    expect(groups[0].items.map((t) => t.id)).toEqual(["late", "early"]);
  });
});

describe("signedAmount", () => {
  it("signs expenses and income only", () => {
    expect(signedAmount("expense", 35000)).toBe("−Rp 35.000");
    expect(signedAmount("income", 8500000)).toBe("+Rp 8.500.000");
    expect(signedAmount("transfer", 200000)).toBe("Rp 200.000");
    expect(signedAmount("saving_deposit", 500000)).toBe("Rp 500.000");
  });
});
