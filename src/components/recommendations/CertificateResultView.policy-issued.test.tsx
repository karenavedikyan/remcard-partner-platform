import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CertificateResultView } from "./CertificateResultView";
import type { StoreCertificate } from "@/lib/certificate-types";

vi.mock("qrcode", () => ({
  default: { toDataURL: () => Promise.resolve("data:image/png;base64,qr") },
}));

describe("CertificateResultView policy-issued preview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the red card with integrated per-partner rows (A expired, B valid)", () => {
    const certificate: StoreCertificate = {
      id: "1",
      promoCode: "P",
      qrCode: "q",
      status: "EXPIRED",
      validUntil: "2020-01-01T00:00:00.000Z",
      maxUsages: 1,
      usageCount: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      certificateUrl: "https://example.com/c/p",
      partners: [
        {
          id: "p1",
          storeUserId: "store-a",
          storeName: "Store A",
          partnershipId: null,
          isSelfScan: false,
          categories: [],
          recipientPolicy: {
            validityDays: 30,
            purchaseLimit: 1,
            minimumPurchaseAmount: null,
            promotionsCompatible: false,
            exclusionsText: null,
            policySource: "general",
            validUntil: "2026-01-01T00:00:00.000Z",
            consumedUses: 1,
            remainingPurchases: 0,
          },
        },
        {
          id: "p2",
          storeUserId: "store-b",
          storeName: "Store B",
          partnershipId: null,
          isSelfScan: false,
          categories: [],
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
      ],
    };

    render(<CertificateResultView certificate={certificate} displayCode="P" />);
    const card = screen.getByTestId("client-certificate-card");
    expect(card).toHaveAttribute("data-policy-card", "true");
    expect(card.className).not.toMatch(/dark/i);
    expect(screen.queryByTestId("issued-policy-dark-card")).not.toBeInTheDocument();
    expect(card).toContainElement(screen.getByTestId("cp-cert-rows"));
    expect(screen.queryByTestId("certificate-issued-recipient-policies")).not.toBeInTheDocument();
    expect(screen.getByTestId("issued-policy-row-store-a")).toHaveAttribute("data-row-state", "expired");
    expect(screen.getByTestId("issued-policy-row-store-b")).toHaveAttribute("data-row-state", "active");
    expect(screen.getByTestId("issued-policy-restrictions-store-b")).toHaveTextContent(
      /Суммируется со скидками/,
    );
    const qr = screen.getByTestId("client-certificate-card-qr");
    expect(qr.className).not.toMatch(/Inactive/);
    expect(screen.getByTestId("issued-policy-status-summary")).toHaveTextContent(/1 из 2/);
  });

  it("keeps legacy red card for certificates without snapshots", () => {
    const certificate: StoreCertificate = {
      id: "1",
      promoCode: "P",
      qrCode: "q",
      status: "ACTIVE",
      validUntil: "2027-01-01T00:00:00.000Z",
      maxUsages: 0,
      usageCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      certificateUrl: "https://example.com/c/p",
      partners: [
        {
          id: "p1",
          storeUserId: "s",
          storeName: "Store",
          partnershipId: null,
          isSelfScan: false,
          categories: [],
        },
      ],
    };
    render(<CertificateResultView certificate={certificate} />);
    expect(screen.getByTestId("client-certificate-card")).toBeInTheDocument();
    expect(screen.getByTestId("client-certificate-card")).not.toHaveAttribute("data-policy-card");
    expect(screen.queryByTestId("cp-cert-rows")).not.toBeInTheDocument();
  });
});