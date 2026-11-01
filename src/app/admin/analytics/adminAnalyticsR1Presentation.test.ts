import { describe, expect, it } from "vitest";
import {
  FUNNEL_STAGE_LABELS,
  parseAnalyticsFunnelRole,
  parseAnalyticsPeriod,
  parseAnalyticsTab,
  sumRegistrationSeries,
} from "./adminAnalyticsR1Presentation";

describe("adminAnalyticsR1Presentation", () => {
  it("defaults tab, period, and funnel role", () => {
    expect(parseAnalyticsTab(null)).toBe("growth");
    expect(parseAnalyticsPeriod(null)).toBe("7d");
    expect(parseAnalyticsFunnelRole("PRO")).toBe("PRO");
  });

  it("sums registration series without fabricating empty rows", () => {
    expect(sumRegistrationSeries([])).toEqual({ clients: null, pros: null });
  });

  it("labels funnel stages without deal wording", () => {
    expect(FUNNEL_STAGE_LABELS.activeRecently).toMatch(/7д/);
  });
});
