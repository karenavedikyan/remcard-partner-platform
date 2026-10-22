import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { instantInMskCalendarRange, validateMskPeriod } from "./mskCalendar";

describe("mskCalendar (frontend)", () => {
  it("matches MSK day across UTC midnight", () => {
    assert.equal(
      instantInMskCalendarRange("2026-10-21T21:30:00.000Z", "2026-10-22", "2026-10-22"),
      true,
    );
  });

  it("validates impossible calendar dates", () => {
    assert.match(validateMskPeriod("2026-02-30", "") ?? "", /Некорректная/);
  });
});
