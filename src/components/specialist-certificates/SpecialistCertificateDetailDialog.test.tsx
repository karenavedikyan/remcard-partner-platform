import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistCertificateDetailDialog } from "./SpecialistCertificateDetailDialog";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("@/lib/business-owner-certificates/issuer-api", () => ({
  fetchIssuerCertificate: vi.fn(),
}));

vi.mock("./SpecialistCertificateEditDetailsDialog", () => ({
  SpecialistCertificateEditDetailsDialog: () => null,
}));

vi.mock("@/components/agent-r03/SpecialistCertificateEditDiscountsDialog", () => ({
  SpecialistCertificateEditDiscountsDialog: () => (
    <div data-testid="discount-dialog-open">discounts</div>
  ),
}));

import { remcardFetch } from "@/lib/api-client";
import { fetchIssuerCertificate } from "@/lib/business-owner-certificates/issuer-api";

const storeCert = {
  id: "c1",
  promoCode: "RC-1",
  qrCode: "qr-1",
  status: "ACTIVE",
  partners: [],
};

function meta(canMutateIssuer: boolean) {
  return {
    certificate: {
      id: "c1",
      displayCode: "RC-1",
      status: "ACTIVE",
      hasOrders: false,
      canMutateIssuer,
    },
  };
}

describe("SpecialistCertificateDetailDialog business capabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(remcardFetch).mockResolvedValue(storeCert);
  });

  it("hides discount entry when canMutateIssuer is false", async () => {
    vi.mocked(fetchIssuerCertificate).mockResolvedValue(meta(false));
    render(
      <SpecialistCertificateDetailDialog
        open
        certificateId="c1"
        issuerListApi="business"
        onClose={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("certificate-detail-view-only-issuer")).toBeVisible();
    });
    expect(screen.queryByRole("button", { name: "Изменить скидки" })).toBeNull();
    expect(screen.queryByTestId("discount-dialog-open")).toBeNull();
  });

  it("shows discount entry when canMutateIssuer is true", async () => {
    vi.mocked(fetchIssuerCertificate).mockResolvedValue(meta(true));
    render(
      <SpecialistCertificateDetailDialog
        open
        certificateId="c1"
        issuerListApi="business"
        onClose={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Изменить скидки" })).toBeVisible();
    });
    expect(screen.queryByTestId("certificate-detail-view-only-issuer")).toBeNull();
  });
});
