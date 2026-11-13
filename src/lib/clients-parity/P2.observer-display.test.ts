import { describe, expect, it } from "vitest";
import { formatObserverDateTime } from "./observer-display";

describe("P2 observer-display", () => {
  it("formatObserverDateTime uses Europe/Moscow for UTC instants", () => {
    expect(formatObserverDateTime("2026-11-13T16:00:00.000Z")).toBe("13 нояб. 2026 г., 19:00");
  });
});
