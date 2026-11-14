import { describe, expect, it } from "vitest";
import {
  CLIENTS_APPEAL_CUSTOM_STAGE_FALLBACK,
  CLIENTS_REFERRER_DISPLAY_FALLBACK,
  resolveClientAppealStageDisplayLabel,
  resolveReferrerDisplayLabel,
} from "./client-appeal-display";
import {
  mapReceivingAppealListRowFromWire,
  receivingStageDisplayLabel,
} from "./receiving-appeals-api";
import { observerAppealStatusLabel } from "./observer-display";
import { k1ReceivingDetailEnvelopeToP4Mapped } from "@/components/clients/receiving/detail-contract-alignment";

describe("P6.client-appeal-display stageLabel", () => {
  it("prefers trusted stageLabel over opaque ws_draft key", () => {
    expect(
      resolveClientAppealStageDisplayLabel({
        stageKey: "ws_draft_1794652553401",
        trustedStageLabel: "ТЕСТ: согласование",
      }),
    ).toBe("ТЕСТ: согласование");
  });

  it("maps sys_* keys without wire stageLabel", () => {
    expect(resolveClientAppealStageDisplayLabel({ stageKey: "sys_paid" })).toBe("Оплачено");
  });

  it("hides raw ws_* when stageLabel missing", () => {
    expect(
      resolveClientAppealStageDisplayLabel({ stageKey: "ws_draft_1794652553401" }),
    ).toBe(CLIENTS_APPEAL_CUSTOM_STAGE_FALLBACK);
  });

  it("maps list wire stageLabel for receiving list", () => {
    const row = mapReceivingAppealListRowFromWire({
      id: "a1",
      clientDisplayName: "X",
      receivingPartnerUserId: "u",
      stageKey: "ws_draft_1",
      stageLabel: "ТЕСТ: согласование",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    expect(
      receivingStageDisplayLabel(row.stageId, { workingStages: [], refusalReasons: [], archivedStages: [] }, row.stageLabel),
    ).toBe("ТЕСТ: согласование");
  });
});

describe("P6.client-appeal-display referrerDisplayName", () => {
  it("uses trimmed referrerDisplayName only", () => {
    expect(resolveReferrerDisplayLabel({ trustedReferrerDisplayName: " Иван П. " })).toBe("Иван П.");
  });

  it("does not show raw referrer user id", () => {
    expect(resolveReferrerDisplayLabel({ trustedReferrerDisplayName: "1794652553401" })).toBe(
      CLIENTS_REFERRER_DISPLAY_FALLBACK,
    );
  });

  it("detail mapper prefers wire referrerDisplayName", () => {
    const mapped = k1ReceivingDetailEnvelopeToP4Mapped(
      {
        appeal: {
          id: "a1",
          clientDisplayName: "Клиент",
          certificateId: "C",
          receivingPartnerUserId: "u1",
          receivingOrganizationId: null,
          receivingBranchId: null,
          referrerProUserId: "1794652553401",
          referrerDisplayName: "Партнёр-направитель",
          originKind: "CERTIFICATE",
          manualSourceKey: null,
          discountPercent: null,
          certValidUntil: null,
          interest: null,
          clientCity: null,
          budgetHint: null,
          clientContact: null,
          stageKey: "sys_new",
          stageLabel: "Новое обращение",
          refusedReason: null,
          shippedAt: null,
          purchaseOrderId: null,
          paidAmountKopecks: 100_000,
          paidAt: null,
          privateNotes: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        revision: 1,
        history: [],
        workingStages: [],
        refusalReasons: [],
      },
      { referrerPartnerName: "1794652553401" },
    );
    expect(mapped.appeal.referrerPartnerName).toBe("Партнёр-направитель");
    expect(mapped.appeal.stageLabel).toBe("Новое обращение");
  });
});

describe("P6.observer stageLabel display", () => {
  it("observerAppealStatusLabel prefers wire stageLabel on view-model", () => {
    expect(
      observerAppealStatusLabel({
        id: "o1",
        clientName: "Клиент",
        certificateId: "",
        receivingPartnerId: "recv",
        referrerPartnerId: "ref",
        stageId: "ws_draft_1794652553401",
        stageLabel: "ТЕСТ: согласование",
        updatedAt: "2026-01-02T00:00:00Z",
      }),
    ).toBe("ТЕСТ: согласование");
  });
});