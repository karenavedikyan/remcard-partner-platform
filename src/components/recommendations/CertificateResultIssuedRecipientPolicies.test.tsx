import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { CertificateResultIssuedRecipientPolicies } from "./CertificateResultIssuedRecipientPolicies";
import type { StoreCertificate } from "@/lib/certificate-types";

const partnerBase = {
  partnershipId: null as string | null,
  isSelfScan: false,
  categories: [] as StoreCertificate["partners"][0]["categories"],
};

function cert(overrides?: Partial<StoreCertificate>): StoreCertificate {
  return {
    id: "1",
    promoCode: "PROMO",
    qrCode: "qr",
    status: "ACTIVE",
    validUntil: "2027-01-01T00:00:00.000Z",
    maxUsages: 0,
    usageCount: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    partners: [
      {
        id: "p1",
        storeUserId: "store-1",
        storeName: "Магазин А",
        ...partnerBase,
        recipientPolicy: {
          validityDays: 30,
          purchaseLimit: 2,
          minimumPurchaseAmount: null,
          promotionsCompatible: false,
          exclusionsText: null,
          policySource: "individual",
          validUntil: "2026-02-01T00:00:00.000Z",
          consumedUses: 0,
          remainingPurchases: 2,
        },
      },
    ],
    ...overrides,
  };
}

function legacyPartner(overrides?: Partial<StoreCertificate["partners"][0]>) {
  return {
    id: "p-legacy",
    storeUserId: "store-legacy",
    storeName: "Legacy store",
    ...partnerBase,
    ...overrides,
  };
}

describe("CertificateResultIssuedRecipientPolicies", () => {
  it("renders per-partner frozen policies at issuance", () => {
    render(<CertificateResultIssuedRecipientPolicies certificate={cert()} />);
    expect(screen.getByTestId("certificate-issued-recipient-policies")).toBeInTheDocument();
    expect(screen.getByTestId("issued-policy-store-1")).toHaveTextContent("Магазин А");
    expect(screen.getByText("Индивидуально")).toBeInTheDocument();
    expect(
      screen.getByText(/Срок и число покупок задаёт принимающий партнёр/),
    ).toBeInTheDocument();
  });

  it("renders nothing when partners lack recipient policies", () => {
    const empty = cert({ partners: [] });
    const { container } = render(<CertificateResultIssuedRecipientPolicies certificate={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("legacy unlimited: shows certificate-level expiry and purchase wording, not 0/0", () => {
    const legacyCert = cert({
      maxUsages: 0,
      usageCount: 2,
      partners: [legacyPartner()],
    });
    render(<CertificateResultIssuedRecipientPolicies certificate={legacyCert} />);
    const row = screen.getByTestId("issued-policy-store-legacy");
    expect(within(row).getByText("Общие лимиты сертификата")).toBeInTheDocument();
    expect(screen.getByTestId("cp-stats-legacy-expiry")).toHaveTextContent(
      /По сроку сертификата/,
    );
    expect(screen.getByTestId("cp-stats-legacy-unlimited")).toHaveTextContent(/Без лимита/);
    expect(screen.queryByText(/0 дней/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 многоразовый/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Срок и число покупок задаёт принимающий партнёр/),
    ).not.toBeInTheDocument();
  });

  it("legacy finite maxUsages: shows purchase count without inventing validity days", () => {
    const legacyCert = cert({
      maxUsages: 5,
      usageCount: 2,
      partners: [legacyPartner()],
    });
    render(<CertificateResultIssuedRecipientPolicies certificate={legacyCert} />);
    const row = screen.getByTestId("issued-policy-store-legacy");
    expect(within(row).getByTestId("cp-stats-legacy-expiry")).toBeInTheDocument();
    expect(within(row).queryByTestId("cp-stats-legacy-unlimited")).not.toBeInTheDocument();
    expect(within(row).getByText("5")).toBeInTheDocument();
    expect(screen.queryByText(/0 дней/)).not.toBeInTheDocument();
  });

  it("mixed partners: snapshot row keeps policy UI, legacy row stays legacy", () => {
    const mixed = cert({
      maxUsages: 0,
      partners: [
        legacyPartner({ storeUserId: "leg", storeName: "Legacy" }),
        {
          id: "p-snap",
          storeUserId: "snap",
          storeName: "Snapshot",
          ...partnerBase,
          recipientPolicy: {
            validityDays: 45,
            purchaseLimit: 1,
            minimumPurchaseAmount: null,
            promotionsCompatible: true,
            exclusionsText: null,
            policySource: "general",
            validUntil: "2026-08-01T00:00:00.000Z",
            consumedUses: 0,
            remainingPurchases: 1,
          },
        },
      ],
    });
    render(<CertificateResultIssuedRecipientPolicies certificate={mixed} />);
    expect(screen.getByTestId("issued-policy-leg")).toBeInTheDocument();
    expect(screen.getByTestId("issued-policy-snap")).toBeInTheDocument();
    expect(screen.getByText("Общие")).toBeInTheDocument();
    expect(screen.getAllByTestId("cp-stats-legacy-expiry")).toHaveLength(1);
    expect(screen.getByText("45")).toBeInTheDocument();
  });
});