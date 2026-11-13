import { describe, expect, it } from "vitest";
import {
  historyEventWireToUi,
  receivingRecordToDetailDto,
  type ClientAppealRecordWire,
} from "./detail-contract-alignment";

describe("P4.detail-contract-alignment (K8 fc33b4fa mirror)", () => {
  it("maps K8 record to receiving detail without dropping ids", () => {
    const record: ClientAppealRecordWire = {
      id: "app-1",
      clientDisplayName: "Иван",
      certificateId: "C-9",
      receivingBranchId: "br-1",
      receivingOrganizationId: "org-1",
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
