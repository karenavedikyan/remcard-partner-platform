import { describe, expect, it } from "vitest";
import type { ReceivingAppealDetailWire } from "@/lib/clients-parity/receiving-appeals-api";
import { receivingAppealDetailWireToK1Envelope } from "./receiving-detail-envelope-bridge";

describe("P6.receiving-detail-envelope-bridge", () => {
  it("preserves privateNotes, contact, discount and cert validity on K1 envelope", () => {
    const wire: ReceivingAppealDetailWire = {
      revision: 3,
      history: [{ at: "2026-01-01T00:00:00Z", authorLabel: "Вы", text: "Создано" }],
      workingStages: [{ id: "ws_a", label: "Замер" }],
      refusalReasons: ["Цена"],
      appeal: {
        id: "a1",
        clientDisplayName: "Клиент",
        stageKey: "sys_new",
        receivingPartnerUserId: "u1",
        originKind: "manual",
        manualSourceKey: "phone",
        privateNotes: "внутренняя",
        clientContact: "+7",
        discountPercent: 10,
        certValidUntil: "2027-01-01",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
    };
    const envelope = receivingAppealDetailWireToK1Envelope(wire);
    expect(envelope.appeal.privateNotes).toBe("внутренняя");
    expect(envelope.appeal.clientContact).toBe("+7");
    expect(envelope.appeal.discountPercent).toBe(10);
    expect(envelope.appeal.certValidUntil).toBe("2027-01-01");
    expect(envelope.revision).toBe(3);
    expect(envelope.history[0]?.authorLabel).toBe("Вы");
  });
});
