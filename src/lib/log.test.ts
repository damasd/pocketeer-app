import { describe, expect, it } from "vitest";
import {
  accountBadge,
  categoryKindFor,
  dateLabel,
  defaultAccountId,
  defaultToAccountId,
  digitsToAmount,
  localDate,
  logProblem,
  modeOf,
  pressKey,
  rankByUse,
  storedType,
} from "./log";

describe("pressKey", () => {
  it("appends digits and 000", () => {
    expect(pressKey("", "3")).toBe("3");
    expect(pressKey("35", "000")).toBe("35000");
  });

  it("drops leading zeros", () => {
    expect(pressKey("", "0")).toBe("");
    expect(pressKey("", "000")).toBe("");
    expect(pressKey("0", "5")).toBe("5");
  });

  it("deletes the last digit", () => {
    expect(pressKey("35000", "back")).toBe("3500");
    expect(pressKey("", "back")).toBe("");
  });

  it("stops at 12 digits", () => {
    expect(pressKey("123456789012", "3")).toBe("123456789012");
    expect(pressKey("1234567890", "000")).toBe("1234567890");
  });
});

describe("digitsToAmount", () => {
  it("converts to whole rupiah", () => {
    expect(digitsToAmount("35000")).toBe(35000);
    expect(digitsToAmount("")).toBe(0);
  });
});

describe("rankByUse", () => {
  const cats = [
    { id: "transport", sortOrder: 1 },
    { id: "food", sortOrder: 2 },
    { id: "food2", sortOrder: 5 },
    { id: "shopping", sortOrder: 6 },
  ];

  it("puts the most used first", () => {
    const used = ["food2", "food2", "food", "food2", null];
    expect(rankByUse(cats, used).map((c) => c.id)).toEqual(["food2", "food", "transport", "shopping"]);
  });

  it("keeps sort order when nothing is used", () => {
    expect(rankByUse(cats, []).map((c) => c.id)).toEqual(["transport", "food", "food2", "shopping"]);
  });
});

describe("defaultAccountId", () => {
  const accounts = [{ id: "bca" }, { id: "gopay" }];

  it("uses the account on the newest transaction", () => {
    expect(defaultAccountId(accounts, [{ accountId: "gopay" }, { accountId: "bca" }])).toBe("gopay");
  });

  it("skips accounts that are no longer available", () => {
    expect(defaultAccountId(accounts, [{ accountId: "archived" }, { accountId: "bca" }])).toBe("bca");
  });

  it("falls back to the first account, or null", () => {
    expect(defaultAccountId(accounts, [])).toBe("bca");
    expect(defaultAccountId([], [])).toBeNull();
  });
});

describe("dates", () => {
  it("formats a local date", () => {
    expect(localDate(new Date(2026, 11, 5))).toBe("2026-12-05");
  });

  it("labels today, yesterday and other days", () => {
    expect(dateLabel("2026-12-07", "2026-12-07")).toBe("Today");
    expect(dateLabel("2026-12-06", "2026-12-07")).toBe("Yesterday");
    expect(dateLabel("2026-12-05", "2026-12-07")).toBe("Sat, 5 Dec");
    expect(dateLabel("2025-12-31", "2026-01-01")).toBe("Yesterday");
    expect(dateLabel("2025-12-05", "2026-01-10")).toBe("Fri, 5 Dec 2025");
  });
});

describe("accountBadge", () => {
  it("uses capitals when there are two or three", () => {
    expect(accountBadge("GoPay")).toBe("GP");
    expect(accountBadge("BCA")).toBe("BCA");
  });

  it("otherwise uses the first two letters", () => {
    expect(accountBadge("Jago")).toBe("JA");
    expect(accountBadge("HSBC")).toBe("HS");
    expect(accountBadge("cash")).toBe("CA");
  });
});

describe("log modes", () => {
  it("maps modes to stored types and back", () => {
    expect(storedType("saving", "deposit")).toBe("saving_deposit");
    expect(storedType("saving", "withdraw")).toBe("saving_withdraw");
    expect(storedType("transfer", "deposit")).toBe("transfer");
    expect(modeOf("saving_withdraw")).toEqual({ mode: "saving", direction: "withdraw" });
    expect(modeOf("income").mode).toBe("income");
  });

  it("has no category kind for transfers", () => {
    expect(categoryKindFor("transfer")).toBeNull();
    expect(categoryKindFor("saving")).toBe("saving");
  });
});

describe("defaultToAccountId", () => {
  const accounts = [{ id: "bca" }, { id: "gopay" }, { id: "pegadaian" }];

  it("reuses the last 'to' of the same type", () => {
    const recent = [
      { type: "expense", toAccountId: null },
      { type: "transfer", toAccountId: "gopay" },
    ];
    expect(defaultToAccountId("transfer", "bca", accounts, recent)).toBe("gopay");
  });

  it("never defaults a transfer to its own 'from'", () => {
    expect(defaultToAccountId("transfer", "gopay", accounts, [{ type: "transfer", toAccountId: "gopay" }])).toBe("bca");
  });

  it("keeps a saving in the same account by default", () => {
    expect(defaultToAccountId("saving_deposit", "bca", accounts, [])).toBe("bca");
  });

  it("is null for expense and income", () => {
    expect(defaultToAccountId("expense", "bca", accounts, [])).toBeNull();
  });
});

describe("logProblem", () => {
  const ok = { mode: "expense" as const, amount: 35000, categoryId: "food", fromId: "bca", toId: null };

  it("accepts a complete expense", () => {
    expect(logProblem(ok)).toBeNull();
  });

  it("asks for amount, category and account in that order", () => {
    expect(logProblem({ ...ok, amount: 0 })).toBe("Type an amount first.");
    expect(logProblem({ ...ok, categoryId: null })).toBe("Pick a category.");
    expect(logProblem({ ...ok, fromId: null })).toBe("Pick an account.");
  });

  it("needs two different accounts for a transfer but no category", () => {
    const t = { mode: "transfer" as const, amount: 200000, categoryId: null, fromId: "bca", toId: "gopay" };
    expect(logProblem(t)).toBeNull();
    expect(logProblem({ ...t, toId: "bca" })).toBe("A transfer needs two different accounts.");
    expect(logProblem({ ...t, toId: null })).toBe("Pick the account to move money to.");
  });

  it("lets a saving stay in the same account", () => {
    expect(logProblem({ mode: "saving", amount: 500000, categoryId: "gold", fromId: "jago", toId: "jago" })).toBeNull();
  });
});
