import { describe, expect, it } from "vitest";
import {
  formatOverviewChartAxisLabel,
  formatOverviewChartFullDay,
} from "./overviewChartDates";
import { overviewPartnerRegistrationNote } from "./overviewCopy";

describe("overviewChartDates (A20e)", () => {
  it("formats axis ticks as DD.MM for distinct days", () => {
    expect(formatOverviewChartAxisLabel("2026-10-25")).toBe("25.10");
    expect(formatOverviewChartAxisLabel("2026-10-26")).toBe("26.10");
    expect(formatOverviewChartAxisLabel("2026-10-27")).not.toMatch(/^2026-/);
  });

  it("exposes full calendar day for tooltips", () => {
    expect(formatOverviewChartFullDay("2026-10-27")).toMatch(/27/);
    expect(formatOverviewChartFullDay("2026-10-27")).toMatch(/2026/);
  });
});

describe("overviewCopy (A20e)", () => {
  it("suppresses raw period id labels like 7d", () => {
    expect(overviewPartnerRegistrationNote("7d", "7d")).toBe("");
    expect(overviewPartnerRegistrationNote("7d", "30d")).toBe("");
    expect(overviewPartnerRegistrationNote("Сравнение с прошлой неделей", "7d")).toBe(
      "Сравнение с прошлой неделей",
    );
  });
});
