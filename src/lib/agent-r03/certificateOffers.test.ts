import { describe, expect, it } from "vitest";
import { certificateListDetail, certificatePartnerSummary } from "./certificateOffers";
import { formatDiscountPercent } from "./formatDiscountPercent";
import type { AgentCertificateRow } from "./types";

const base: AgentCertificateRow = {
  id: "c1",
  promoCode: "RC-1",
  displayCode: "А-RC-1",
  qrCode: "qr",
  status: "ACTIVE",
  validUntil: null,
  maxUsages: 1,
  usageCount: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  userAlias: null,
  title: "Test",
  directionLabel: null,
  partnerStoreName: "Shop",
  partnerCount: 2,
  categorySummary: "Doors",
  discountPercent: 5,
  archivedInWorkspace: false,
  hasOrders: false,
  agentClient: null,
  issuerKindSnapshot: null,
};

describe("certificateOffers", () => {
  it("renders per-partner category lines when partnerOffers present", () => {
    const cert: AgentCertificateRow = {
      ...base,
      partnerOffers: [
        {
          storeName: "Doors shop",
          categories: [
            { categoryLabel: "Двери", discountPercent: 5 },
            { categoryLabel: "Напольные покрытия", discountPercent: 7 },
          ],
        },
        { storeName: "Plumber Co", categories: [{ categoryLabel: "Сантехника", discountPercent: 5 }] },
      ],
    };
    expect(certificateListDetail(cert)).toContain("Doors shop: Двери 5%");
    expect(certificateListDetail(cert)).toContain("Plumber Co: Сантехника 5%");
    expect(certificatePartnerSummary(cert)).toContain("+1 партнёра");
    expect(formatDiscountPercent(5.5)).toBe("5.5");
  });
});
