import { describe, expect, it } from "vitest";
import { receiptPrompt, toReceiptDraft } from "./receipt";

const ctx = { categoryIds: ["food", "transport"], today: "2026-11-25", noteMax: 120 };

describe("toReceiptDraft", () => {
  it("keeps a clean reading", () => {
    expect(
      toReceiptDraft({ isReceipt: true, store: "Indomaret", date: "2026-11-24", total: 35000, categoryId: "food" }, ctx),
    ).toEqual({ amount: 35000, note: "Indomaret", date: "2026-11-24", categoryId: "food" });
  });

  it("returns null when the photo is not a receipt", () => {
    expect(toReceiptDraft({ isReceipt: false, store: null, date: null, total: null, categoryId: null }, ctx)).toBeNull();
  });

  it("returns null when nothing could be read", () => {
    expect(toReceiptDraft({ isReceipt: true, store: " ", date: null, total: null, categoryId: "food" }, ctx)).toBeNull();
    expect(toReceiptDraft("not json", ctx)).toBeNull();
    expect(toReceiptDraft(null, ctx)).toBeNull();
  });

  it("rounds to whole rupiah and rejects zero, negative or huge totals", () => {
    expect(toReceiptDraft({ store: "A", total: 12480.4 }, ctx)?.amount).toBe(12480);
    expect(toReceiptDraft({ store: "A", total: 0 }, ctx)?.amount).toBeNull();
    expect(toReceiptDraft({ store: "A", total: -5000 }, ctx)?.amount).toBeNull();
    expect(toReceiptDraft({ store: "A", total: 1e13 }, ctx)?.amount).toBeNull();
  });

  it("reads a total sent as text with dots", () => {
    expect(toReceiptDraft({ store: "A", total: "Rp 35.000" }, ctx)?.amount).toBe(35000);
  });

  it("drops a category that isn't one of the user's", () => {
    expect(toReceiptDraft({ store: "A", total: 1000, categoryId: "made-up" }, ctx)?.categoryId).toBeNull();
  });

  it("drops impossible, future or very old dates", () => {
    expect(toReceiptDraft({ store: "A", date: "2026-02-30" }, ctx)?.date).toBeNull();
    expect(toReceiptDraft({ store: "A", date: "2026-12-11" }, ctx)?.date).toBeNull();
    expect(toReceiptDraft({ store: "A", date: "2025-11-24" }, ctx)?.date).toBeNull();
    expect(toReceiptDraft({ store: "A", date: "25/11/2026" }, ctx)?.date).toBeNull();
    expect(toReceiptDraft({ store: "A", date: "2026-11-25" }, ctx)?.date).toBe("2026-11-25");
  });

  it("tidies and shortens the store name", () => {
    expect(toReceiptDraft({ store: "  Kopi   Kenangan ", total: 1 }, ctx)?.note).toBe("Kopi Kenangan");
    expect(toReceiptDraft({ store: "x".repeat(300), total: 1 }, { ...ctx, noteMax: 10 })?.note).toBe("x".repeat(10));
  });
});

describe("receiptPrompt", () => {
  it("lists every category with its id and note", () => {
    const p = receiptPrompt([{ id: "food", name: "Food", note: "meals, snacks" }, { id: "t", name: "Transport", note: null }], "2026-11-25");
    expect(p).toContain("- food: Food (meals, snacks)");
    expect(p).toContain("- t: Transport");
    expect(p).toContain("Today is 2026-11-25");
  });
});
