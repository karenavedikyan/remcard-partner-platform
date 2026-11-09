import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { PartnerClientCertificateCard } from "./PartnerClientCertificateCard";
import type { StoreCertificateClientCardModel } from "@/lib/storeCertificateClientCardModel";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn() },
}));

const model: StoreCertificateClientCardModel = {
  active: true,
  state: "active",
  title: "Скидочный сертификат",
  pctTextValue: "−10 %",
  pctSubtitleText: "в ОПТОВИК",
  visibleCode: "С-RC-X9Z0WZ",
  certificateUrl: "https://cert.example.com/certificate/qr-a",
  termTextValue: "Бессрочный",
  statusLabelText: "Активен",
  stampText: null,
};

describe("PartnerClientCertificateCard QR generation", () => {
  beforeEach(() => {
    vi.mocked(QRCode.toDataURL).mockReset();
    vi.mocked(QRCode.toDataURL).mockResolvedValue("data:image/png;base64,aaa");
  });

  it("clears stale QR when certificate URL changes", async () => {
    const { rerender } = render(<PartnerClientCertificateCard model={model} />);
    await waitFor(() => {
      expect(screen.getByTestId("specialist-certificate-preview-qr")).toBeInTheDocument();
    });

    vi.mocked(QRCode.toDataURL).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("data:image/png;base64,bbb"), 50)),
    );

    rerender(
      <PartnerClientCertificateCard
        model={{ ...model, certificateUrl: "https://cert.example.com/certificate/qr-b" }}
      />,
    );

    expect(screen.queryByTestId("specialist-certificate-preview-qr")).toBeNull();
    expect(screen.getByText("QR")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("specialist-certificate-preview-qr")).toBeInTheDocument();
    });
    expect(QRCode.toDataURL).toHaveBeenLastCalledWith(
      "https://cert.example.com/certificate/qr-b",
      expect.any(Object),
    );
  });

  it("shows fallback when QR generation fails", async () => {
    vi.mocked(QRCode.toDataURL).mockRejectedValue(new Error("canvas unavailable"));
    render(<PartnerClientCertificateCard model={model} />);
    expect(await screen.findByText("Нет QR")).toBeInTheDocument();
    expect(screen.queryByTestId("specialist-certificate-preview-qr")).toBeNull();
  });

  it("does not pair stale QR bitmap with a new code before URL generation completes", async () => {
    let resolveA: (value: string) => void = () => {};
    vi.mocked(QRCode.toDataURL).mockImplementation((url) => {
      if (url === "https://cert.example.com/certificate/qr-a") {
        return new Promise((resolve) => {
          resolveA = resolve;
        });
      }
      return Promise.resolve("data:image/png;base64,bbb");
    });

    const { rerender } = render(<PartnerClientCertificateCard model={model} />);
    expect(screen.queryByTestId("specialist-certificate-preview-qr")).toBeNull();

    rerender(
      <PartnerClientCertificateCard
        model={{
          ...model,
          visibleCode: "С-RC-NEWCODE",
          certificateUrl: "https://cert.example.com/certificate/qr-b",
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("specialist-certificate-preview-qr")).toBeInTheDocument();
    });
    expect(screen.getByTestId("certificate-code")).toHaveTextContent("С-RC-NEWCODE");

    resolveA("data:image/png;base64,aaa");
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        "https://cert.example.com/certificate/qr-a",
        expect.any(Object),
      );
    });
    expect(screen.queryByAltText(/QR-код документа С-RC-X9Z0WZ/)).toBeNull();
    expect(screen.getByAltText(/QR-код документа С-RC-NEWCODE/)).toBeInTheDocument();
  });
});
