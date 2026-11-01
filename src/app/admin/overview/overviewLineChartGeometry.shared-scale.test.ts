import { describe, expect, it } from "vitest";
import { buildLineGeometry } from "./overviewLineChartGeometry";

describe("shared registration chart scale", () => {
  it("uses one scale for populations with different maximum values", () => {
    const clients = buildLineGeometry([3, 5], 320, 204, 20);
    const pros = buildLineGeometry([5, 20], 320, 204, 20);
    expect(clients.max).toBe(22);
    expect(pros.max).toBe(22);
    expect(clients.yAt(5)).toBe(pros.yAt(5));
    expect(clients.guides).toEqual(pros.guides);
  });

  it("preserves the existing independent overview geometry by default", () => {
    expect(buildLineGeometry([3, 5], 320, 204).max).toBe(7);
    expect(buildLineGeometry([5, 20], 320, 204).max).toBe(22);
  });
});
