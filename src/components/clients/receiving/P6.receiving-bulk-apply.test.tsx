import { describe, expect, it } from "vitest";
import { RECEIVING_SYSTEM_STAGE } from "@/lib/clients-parity/receiving-appeals-api";
import {
  isReceivingAppealLockedForBulkStage,
  isReceivingFinancialStageKey,
} from "@/lib/clients-parity/receiving-bulk-apply";
import { normalizeReceivingPerIdBulkApply } from "@/lib/clients-parity/receiving-bulk-contract";

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
    expect(isReceivingFinancialStageKey("ws_measure")).toBe(false);
  });

  it("normalize partial per-id PATCH keeps failed selection", () => {
    const result = normalizeReceivingPerIdBulkApply({
      updatedIds: ["a1"],
      skippedIds: ["a2"],
      failures: [{ id: "a2", reason: "version_conflict" }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.kind).toBe("partial");
  });
});
