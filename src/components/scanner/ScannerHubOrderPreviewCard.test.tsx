import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScannerHubOrderPreviewCard } from "./ScannerHubOrderPreviewCard";
import type { OrderPreviewAllowed } from "@/lib/order-types";

vi.mock("qrcode", () => ({
  default: { toDataURL: () => Promise.resolve("data:image/png;base64,qr") },
}));

function policyPreview(): OrderPreviewAllowed {
  return {
    allowed: true,
    certificate: {
      id: "c1",
      promoCode: "RC-1",
      status: "ACTIVE",
      validUntil: "2026-12-01T00:00:00.000Z",
      usageCount: 0,
      maxUsages: 2,
      userAlias: "Иван",
      issuer: { label: "Эмитент", name: "Org" },
      partnerCards: [],
      recipientPolicy: {
        validityDays: 60,
        purchaseLimit: 2,
        minimumPurchaseAmount: null,
        promotionsCompatible: true,
        exclusionsText: null,
        policySource: "individual",
        validUntil: "2026-12-01T00:00:00.000Z",
        consumedUses: 0,
        remainingPurchases: 2,
      },
    },
    partner: {
      id: "p1",
      storeUserId: "store-1",
      storeName: "Store One",
      isSelfScan: false,
      recipientPolicy: {
        validityDays: 60,
        purchaseLimit: 2,
        minimumPurchaseAmount: null,
        promotionsCompatible: true,
        exclusionsText: null,
        policySource: "individual",
        validUntil: "2026-12-01T00:00:00.000Z",
        consumedUses: 0,
        remainingPurchases: 2,
      },
    },
    availableCategories: [
      {
        category: "paint",
        categoryLabel: "Краска",
        discountPercent: 10,
        issuerPercent: 3,
        proBonusPercent: 3,
      },
    ],
    referringPartner: null,
  };
}

describe("ScannerHubOrderPreviewCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the red certificate card with per-recipient rows when recipientPolicy snapshot is present", () => {
    render(<ScannerHubOrderPreviewCard preview={policyPreview()} operationCode="QR-OP" />);
    const card = screen.getByTestId("client-certificate-card");
    expect(card).toHaveAttribute("data-policy-card", "true");
    expect(screen.queryByTestId("issued-policy-dark-card")).not.toBeInTheDocument();
    expect(card).toContainElement(screen.getByTestId("cp-cert-rows"));
  });

  it("renders legacy partner card when no recipientPolicy on partner", () => {
    const preview = policyPreview();
    preview.partner = { ...preview.partner, recipientPolicy: undefined };
    preview.certificate = { ...preview.certificate, recipientPolicy: undefined };
    render(<ScannerHubOrderPreviewCard preview={preview} operationCode="QR-OP" />);
    expect(screen.queryByTestId("cp-cert-rows")).not.toBeInTheDocument();
    expect(screen.getByTestId("client-certificate-card")).not.toHaveAttribute("data-policy-card");
  });
});