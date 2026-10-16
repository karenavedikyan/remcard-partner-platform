import { describe, expect, it } from "vitest";
import {
  certificateLifecycleStatusLabel,
  certificatePurchaseStatusLabel,
} from "./certificatePurchaseStatus";
import type { AgentCertificateRow } from "./types";

const base: AgentCertificateRow = {
  id: "c1",
  promoCode: "PROMO",
  displayCode: "A-TEST",
  qrCode: "qr",
  status: "ACTIVE",
  validUntil: null,
  maxUsages: 0,
  usageCount: 0,
  createdAt: "2026-10-01T00:00:00.000Z",
  userAlias: "Alias",
  title: "Title",
  directionLabel: null,
  partnerStoreName: null,
  partnerCount: 1,
  categorySummary: null,
  discountPercent: 5,
  archivedInWorkspace: false,
  hasOrders: false,
  agentClient: null,
  issuerKindSnapshot: null,
};

describe("certificatePurchaseStatusLabel", () => {
  it("maps hasOrders to purchase copy", () => {
    expect(certificatePurchaseStatusLabel({ ...base, hasOrders: true })).toBe("Есть покупки");
    expect(certificatePurchaseStatusLabel({ ...base, hasOrders: false })).toBe("Ожидает покупки");
  });

  it("keeps lifecycle label separate from purchase state", () => {
    expect(certificateLifecycleStatusLabel(base)).toBe("Активен");
    expect(certificatePurchaseStatusLabel(base)).toBe("Ожидает покупки");
  });
});
