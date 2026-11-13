import { describe, expect, it } from "vitest";
import { partnerAppealStats, safePct } from "./observer-stats";
import type { ObserverReferredAppeal } from "./types";

describe("partnerAppealStats", () => {
  const base: ObserverReferredAppeal = {
    id: "a1",
    clientName: "Test",
    receivingPartnerId: "p1",
    referrerPartnerId: "me",
    updatedAt: "2026-01-01T12:00:00Z",
    stageId: "sys_new",
    certificateId: "",
  };

  it("computes conversion with prototype labels", () => {
    const list: ObserverReferredAppeal[] = [
      base,
      { ...base, id: "a2", stageId: "sys_paid", updatedAt: "2026-01-02T12:00:00Z" },
      { ...base, id: "a3", stageId: "sys_refused" },
    ];
    const stats = partnerAppealStats(list);
    expect(stats.total).toBe(3);
    expect(stats.paidThrough).toBe(1);
    expect(stats.refusals).toBe(1);
    expect(stats.inWork).toBe(1);
    expect(stats.conv).toBe(safePct(1, 3));
  });
});
