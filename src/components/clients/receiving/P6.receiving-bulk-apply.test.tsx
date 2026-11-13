import { describe, expect, it } from "vitest";
import { RECEIVING_SYSTEM_STAGE } from "@/lib/clients-parity/receiving-appeals-api";
import {
  isReceivingAppealLockedForBulkStage,
  isReceivingFinancialStageKey,
} from "@/lib/clients-parity/receiving-bulk-apply";
import {
  aggregateReceivingPatchResults,
  buildReceivingBulkPatchIntents,
} from "./receiving-bulk-handoff";

describe("P6.receiving-bulk-apply", () => {
  it("locks financial rows for bulk stage edits", () => {
    expect(
      isReceivingAppealLockedForBulkStage({
        id: "a",
        clientName: "x",
        certificateId: "",
        receivingPartnerUserId: "u",
        receivingPartnerId: "u",
        referrerPartnerId: "r",
        interest: "",
        stageId: RECEIVING_SYSTEM_STAGE.PAID,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      }),
    ).toBe(true);
    expect(isReceivingFinancialStageKey(RECEIVING_SYSTEM_STAGE.PAID)).toBe(true);
    expect(isReceivingFinancialStageKey(RECEIVING_SYSTEM_STAGE.RETURN)).toBe(true);
    expect(isReceivingFinancialStageKey("ws_measure")).toBe(false);
  });

  it("uses P5 intent builder and aggregate for partial per-id PATCH", () => {
    const built = buildReceivingBulkPatchIntents(["a1", "a2"], {
      stageId: "",
      serviceNote: "note",
      appendNote: true,
    }, { stageBlocked: true });
    expect(built.intents.length).toBeGreaterThan(0);
    const result = aggregateReceivingPatchResults([
      { appealId: "a1", ok: true },
      { appealId: "a2", ok: false, reason: "version_conflict", message: "conflict" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kind).toBe("partial");
  });
});
