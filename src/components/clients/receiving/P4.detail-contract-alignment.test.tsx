import { describe, expect, it } from "vitest";
import {
  historyEventWireToUi,
  isActiveAppealStage,
  receivingPartnerPrincipalToObserverMeta,
  p6ReceivingDetailToP4Ready,
  receivingRecordToDetailDto,
  type ClientAppealRecordWire,
} from "./detail-contract-alignment";

describe("P4.detail-contract-alignment (K8 fc33b4fa mirror)", () => {
  it("maps K8 record to receiving detail without dropping ids", () => {
    const record: ClientAppealRecordWire = {
      id: "app-1",
      clientDisplayName: "Иван",
      certificateId: "C-9",
      receivingPartnerUserId: "user-receiver-solo",
      receivingOrganizationId: null,
      receivingBranchId: null,
      referrerProUserId: "u-2",
      originKind: "CERTIFICATE",
      interest: "Шкаф",
      clientContact: "+7",
      stageKey: "sys_new",
      refusedReason: null,
      updatedAt: "2026-11-10T10:00:00Z",
      createdAt: "2026-11-01T10:00:00Z",
      privateNotes: "secret",
    };
    const dto = receivingRecordToDetailDto(record, {
      stageLabel: "Новое",
      sourceLabel: "Сертификат",
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

  it("p6 detail envelope omits financial fields from UI props", () => {
    const ready = p6ReceivingDetailToP4Ready(
      {
        id: "a1",
        clientName: "X",
        certificateId: "c",
        receivingPartnerUserId: "u1",
        interest: "i",
        stageId: "sys_new",
        updatedAt: "2026-11-10T10:00:00Z",
        history: [{ at: "2026-11-10T10:00:00Z", author: "S", text: "Новое" }],
        paidAmount: 999,
        paidAt: "2026-11-11T10:00:00Z",
        purchaseId: "ord-1",
      },
      { stageLabel: "Новое", sourceLabel: "Сертификат", referrerPartnerName: null },
    );
    expect(ready.status).toBe("ready");
    expect(ready.history.length).toBe(1);
    expect(JSON.stringify(ready.appeal)).not.toMatch(/999|ord-1/);
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
