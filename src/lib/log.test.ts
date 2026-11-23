import { describe, expect, it } from "vitest";
import { accountBadge, dateLabel, defaultAccountId, digitsToAmount, localDate, pressKey, rankByUse } from "./log";

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
