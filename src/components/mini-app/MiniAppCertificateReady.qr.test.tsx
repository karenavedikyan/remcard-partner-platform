import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { MiniAppCertificateReady } from "./MiniAppCertificateReady";
import { MINI_APP_FIXTURE_CREATED_CERTIFICATE } from "@/app/dev/mini-app-fixture/fixtures-data";
import { resolveCertificatePageUrl, getCertificateCodeForApi } from "@/lib/certificate-url";

function dataUrlToImageData(dataUrl: string): { data: Uint8ClampedArray; width: number; height: number } {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  const png = PNG.sync.read(Buffer.from(base64, "base64"));
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

function decodeQrDataUrl(dataUrl: string): string | null {
  const { data, width, height } = dataUrlToImageData(dataUrl);
  return jsQR(data, width, height)?.data ?? null;
}

describe("MiniAppCertificateReady QR", () => {
  it("decodes QR to server certificateUrl and shows display code", async () => {
    const cert = MINI_APP_FIXTURE_CREATED_CERTIFICATE;
    const pageUrl = resolveCertificatePageUrl(cert);
    expect(pageUrl).toBe(cert.certificateUrl);

    render(<MiniAppCertificateReady certificate={cert} onBack={() => {}} />);

    const code = getCertificateCodeForApi(cert);
    expect(await screen.findByTestId("mini-cert-code")).toHaveTextContent(code);

    const img = await screen.findByTestId("specialist-certificate-preview-qr", {}, { timeout: 15_000 });
    await waitFor(
      () => {
        const src = img.getAttribute("src") ?? "";
        expect(src.startsWith("data:image")).toBe(true);
        expect(decodeQrDataUrl(src)).toBe(pageUrl);
      },
      { timeout: 15_000 },
    );
    expect(screen.queryByText("QR недоступен")).toBeNull();
  });

  it("fixture certificateUrl encodes to matching QR payload", async () => {
    const pageUrl = resolveCertificatePageUrl(MINI_APP_FIXTURE_CREATED_CERTIFICATE);
    const dataUrl = await QRCode.toDataURL(pageUrl, { margin: 4, width: 200 });
    expect(decodeQrDataUrl(dataUrl)).toBe(pageUrl);
  });
});