import { describe, expect, it } from "vitest";
import {
  parseBranchWorkingHours,
  serializeBranchWorkingHours,
  validateBranchWorkingHoursText,
  weekTemplateSchedule,
} from "@/lib/branch-working-hours";

describe("branch-working-hours", () => {
  it("empty schedule stays empty", () => {
    expect(parseBranchWorkingHours(null).mode).toBe("empty");
    expect(parseBranchWorkingHours("   ").mode).toBe("empty");
  });

  it("round-trips full grid schedule", () => {
    const days = weekTemplateSchedule();
    days.mon = { closed: false, open: "10:00", close: "19:00" };
    const text = serializeBranchWorkingHours(days);
    const parsed = parseBranchWorkingHours(text);
    expect(parsed.mode).toBe("grid");
    if (parsed.mode === "grid") {
      expect(parsed.days.mon.open).toBe("10:00");
    }
  });

  it("keeps legacy text with break and partial days", () => {
    const legacy = "пн 09:00–18:00, перерыв 13:00–14:00, ср 10:00–17:00";
    const parsed = parseBranchWorkingHours(legacy);
    expect(parsed.mode).toBe("legacy");
    if (parsed.mode === "legacy") expect(parsed.text).toBe(legacy);
  });

  it("rejects 09:99 on client validator", () => {
    expect(validateBranchWorkingHoursText("пн 09:99–18:00")).toMatch(/Некорректное время/);
  });
});
