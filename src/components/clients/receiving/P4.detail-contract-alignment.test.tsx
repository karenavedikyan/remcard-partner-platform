import { describe, expect, it } from "vitest";
import {
  historyEventWireToUi,
  isActiveAppealStage,
  k1ReceivingDetailEnvelopeToP4Mapped,
  receivingPartnerPrincipalToObserverMeta,
  resolveClientAppealSourceLabel,
  resolveClientAppealStageLabel,
  receivingRecordToDetailDto,
  type ClientAppealRecordWire,
} from "./detail-contract-alignment";

const baseRecord = (): ClientAppealRecordWire => ({
  id: "app-1",
  clientDisplayName: "Иван",
  certificateId: "C-9",
  receivingPartnerUserId: "user-receiver-solo",
  receivingOrganizationId: null,
  receivingBranchId: null,
  referrerProUserId: "u-2",
  originKind: "CERTIFICATE",
  manualSourceKey: null,
  discountPercent: null,
  certValidUntil: null,
  interest: "Шкаф",
  clientCity: null,
  budgetHint: null,
  clientContact: "+7",
  stageKey: "sys_new",
  refusedReason: null,
  shippedAt: null,
  purchaseOrderId: null,
  paidAmountKopecks: null,
  paidAt: null,
  updatedAt: "2026-11-10T10:00:00Z",
  createdAt: "2026-11-01T10:00:00Z",
  privateNotes: "secret",
});

describe("P4.detail-contract-alignment (K8 0f4fe833 / K1 5a51d7b7)", () => {
  it("maps K8 record to receiving detail without dropping ids", () => {
    const record = baseRecord();
    const dto = receivingRecordToDetailDto(record, {
      stageLabel: "Новое",
      sourceLabel: "По сертификату",
      referrerPartnerName: "Партнёр",
    });
    expect(dto.id).toBe("app-1");
    expect(dto.clientContact).toBe("+7");
    expect(dto.stageLabel).toBe("Новое");
    expect(dto.receivingPartnerUserId).toBe("user-receiver-solo");
    expect(dto.receivingBranchId).toBeNull();
  });

  it("maps receiving principal to observer partner meta by User.id", () => {
    const meta = receivingPartnerPrincipalToObserverMeta({
      receivingPartnerUserId: "usr-9",
      displayName: "Соло специалист",
    });
    expect(meta.id).toBe("usr-9");
    expect(meta.name).toBe("Соло специалист");
  });

  it("K1 envelope maps clientDisplayName, stageKey, history, paidAmountKopecks", () => {
    const mapped = k1ReceivingDetailEnvelopeToP4Mapped({
      appeal: {
        ...baseRecord(),
        paidAmountKopecks: 150_000,
        paidAt: "2026-11-11T12:00:00Z",
      },
      revision: 3,
      history: [
        {
          id: "h1",
          appealId: "app-1",
          at: "2026-11-10T10:00:00Z",
          authorLabel: "Система",
          text: "Создано обращение",
        },
      ],
      workingStages: [{ id: "ws_custom", label: "Согласование" }],
      refusalReasons: ["Дорого"],
    });
    expect(mapped.revision).toBe(3);
    expect(mapped.appeal.clientName).toBe("Иван");
    expect(mapped.appeal.stageId).toBe("sys_new");
    expect(mapped.appeal.paidDisplayLabel).toContain("1");
    expect(mapped.appeal.paidDisplayLabel).toContain("₽");
    expect(mapped.history).toHaveLength(1);
    expect(mapped.history[0]?.author).toBe("Система");
    expect(mapped.appeal.privateNotes).toBe("secret");
    expect(resolveClientAppealStageLabel("ws_custom", mapped.workingStages)).toBe("Согласование");
  });

  it("readOnly mapper drops privateNotes from appeal DTO", () => {
    const mapped = k1ReceivingDetailEnvelopeToP4Mapped(
      {
        appeal: baseRecord(),
        revision: 1,
        history: [],
        workingStages: [],
        refusalReasons: [],
      },
      { readOnly: true },
    );
    expect(mapped.appeal.privateNotes).toBeNull();
  });

  it("resolves source labels from originKind and manualSourceKey", () => {
    expect(resolveClientAppealSourceLabel({ originKind: "CERTIFICATE", manualSourceKey: null })).toBe(
      "По сертификату",
    );
    expect(resolveClientAppealSourceLabel({ originKind: "MANUAL", manualSourceKey: "phone" })).toBe("Звонок");
  });

  it("isActiveAppealStage matches prototype refused/return only", () => {
    expect(isActiveAppealStage("sys_new")).toBe(true);
    expect(isActiveAppealStage("sys_refused")).toBe(false);
    expect(isActiveAppealStage("return")).toBe(false);
  });

  it("maps K8 history event authorLabel", () => {
    expect(
      historyEventWireToUi({
        id: "h1",
        appealId: "app-1",
        at: "2026-11-10T10:00:00Z",
        authorLabel: "Система",
        text: "Оплачено",
      }).author,
    ).toBe("Система");
  });
});
