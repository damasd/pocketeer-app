import { describe, expect, it } from "vitest";
import { OFFLINE_MESSAGE, errorMessage } from "./errors";

describe("errorMessage", () => {
  it("uses the error's own message", () => {
    expect(errorMessage(new Error("permission denied for table x"), "fallback")).toBe("permission denied for table x");
    expect(errorMessage({ message: "Supabase says no", code: "42501" }, "fallback")).toBe("Supabase says no");
  });

  it("explains a lost connection in plain words", () => {
    expect(errorMessage(new TypeError("Load failed"), "x")).toBe(OFFLINE_MESSAGE); // Safari
    expect(errorMessage(new TypeError("Failed to fetch"), "x")).toBe(OFFLINE_MESSAGE); // Chrome
    expect(errorMessage({ message: "TypeError: Failed to fetch" }, "x")).toBe(OFFLINE_MESSAGE); // Supabase wraps it
    expect(errorMessage(new TypeError("NetworkError when attempting to fetch resource."), "x")).toBe(OFFLINE_MESSAGE);
  });

  it("falls back when there is no message", () => {
    expect(errorMessage(null, "Could not save")).toBe("Could not save");
    expect(errorMessage({ message: "" }, "Could not save")).toBe("Could not save");
  });
});
