import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CertificateResultView } from "./CertificateResultView";
import type { StoreCertificate } from "@/lib/certificate-types";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

const baseCert: StoreCertificate = {
  id: "c1",
  promoCode: "RC-JXHDPR",
  qrCode: "qr1",
  issuerKindSnapshot: "AGENT",
  status: "ACTIVE",
  validUntil: null,
  maxUsages: 0,
  usageCount: 0,
  createdAt: new Date().toISOString(),
  partners: [],
};

describe("CertificateResultView display code", () => {
  it("shows prefixed display code when displayCode prop set", async () => {
    render(
      <CertificateResultView
        certificate={{ ...baseCert, certificateUrl: "https://example.com/certificate/qr1" }}
        displayCode="А-RC-JXHDPR"
      />,
    );
    expect(screen.getByText("А-RC-JXHDPR")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "QR-код документа А-RC-JXHDPR" })).toBeInTheDocument();
  });

  it("falls back to promoCode when displayCode omitted (legacy)", () => {
    render(<CertificateResultView certificate={{ ...baseCert, issuerKindSnapshot: null }} />);
    expect(screen.getByText("RC-JXHDPR")).toBeInTheDocument();
  });
});
