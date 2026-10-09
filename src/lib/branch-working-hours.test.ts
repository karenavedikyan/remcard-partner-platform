import { describe, expect, it } from "vitest";
import {
  emptyWeekSchedule,
  parseBranchWorkingHours,
  serializeBranchWorkingHours,
} from "@/lib/branch-working-hours";

describe("branch-working-hours", () => {
  it("round-trips grid schedule", () => {
    const days = emptyWeekSchedule();
    days.mon = { closed: false, open: "10:00", close: "19:00" };
    const text = serializeBranchWorkingHours(days);
    const parsed = parseBranchWorkingHours(text);
    expect(parsed.mode).toBe("grid");
    if (parsed.mode === "grid") {
      expect(parsed.days.mon.open).toBe("10:00");
      expect(parsed.days.mon.close).toBe("19:00");
    }
  });

  it("keeps legacy text when not parseable", () => {
    const parsed = parseBranchWorkingHours("звоните заранее");
    expect(parsed.mode).toBe("legacy");
    if (parsed.mode === "legacy") expect(parsed.text).toBe("звоните заранее");
  });
});
