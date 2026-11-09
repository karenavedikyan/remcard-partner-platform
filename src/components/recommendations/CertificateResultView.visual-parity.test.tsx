import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { CertificateResultView } from "./CertificateResultView";
import type { StoreCertificate } from "@/lib/certificate-types";
import { remcardFetchBlob } from "@/lib/api-client";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetchBlob: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

const pageUrl = "https://cert.example.com/certificate/qr-store-1";

function storeStyleCert(overrides: Partial<StoreCertificate> = {}): StoreCertificate {
  return {
    id: "c-store",
    promoCode: "RC-STORE01",
    qrCode: "qr-store-1",
    issuerKindSnapshot: "STORE",
    status: "ACTIVE",
    validUntil: null,
    maxUsages: 0,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    certificateUrl: pageUrl,
    discountPercent: 5,
    partners: [
      {
        id: "cp1",
        storeUserId: "s1",
        storeName: "Дом материалов",
        partnershipId: "pt1",
        isSelfScan: false,
        categories: [
          { category: "floors", categoryLabel: "Напольные покрытия", discountPercent: 5 },
          { category: "doors", categoryLabel: "Двери", discountPercent: 5 },
          { category: "walls", categoryLabel: "Отделка стен", discountPercent: 5 },
        ],
      },
    ],
    ...overrides,
  };
}

async function renderCard(
  presentation: "default" | "specialist",
  extra?: { privateAlias?: string; displayCode?: string },
) {
  const cert = storeStyleCert();
  render(
    <CertificateResultView
      certificate={cert}
      displayCode={extra?.displayCode ?? "М-RC-STORE01"}
      presentation={presentation}
      privateAlias={extra?.privateAlias ?? null}
    />,
  );
  await waitFor(() => {
    expect(screen.getByTestId("client-certificate-card")).toBeInTheDocument();
  });
}

describe("CertificateResultView client public card parity", () => {
  beforeEach(() => {
    vi.mocked(remcardFetchBlob).mockReset();
    vi.mocked(QRCode.toDataURL).mockResolvedValue("data:image/png;base64,test");
  });

  it.each(["default", "specialist"] as const)(
    "renders v2 red gradient card for presentation=%s",
    async (presentation) => {
      await renderCard(presentation);

      expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument();
      expect(screen.getByTestId("client-certificate-card")).toBeInTheDocument();
      expect(screen.getByTestId("client-certificate-card")).toHaveTextContent(/remcard\./i);
      expect(screen.getByText("Скидочный сертификат")).toBeInTheDocument();
      expect(screen.queryByText("Скидочный сертификат RemCard")).toBeNull();
      expect(screen.queryByRole("heading", { name: /Скидочный сертификат RemCard/i })).toBeNull();
      const card = screen.getByTestId("client-certificate-card");
      expect(within(card).getByText("КОД")).toBeInTheDocument();
      expect(screen.getByTestId("certificate-code")).toHaveTextContent("М-RC-STORE01");
      expect(screen.getByRole("button", { name: "Скопировать код" })).toBeInTheDocument();
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        pageUrl,
        expect.objectContaining({
          margin: 0,
          width: 128,
          color: { dark: "#1b1f1a", light: "#ffffff" },
        }),
      );
    },
  );

  it("shows alias block only when privateAlias is provided", async () => {
    await renderCard("default", { privateAlias: "Сертификат для клиента" });
    expect(screen.getByText("Название для себя")).toBeInTheDocument();
    expect(screen.getByText("Сертификат для клиента")).toBeInTheDocument();
  });

  it("hides alias block when privateAlias is omitted", async () => {
    await renderCard("specialist");
    expect(screen.queryByText("Название для себя")).toBeNull();
  });

  it("public view link uses resolved page URL and excludes private alias", async () => {
    await renderCard("default", {
      privateAlias: "Секретное имя",
      displayCode: "К-RC-STORE01",
    });
    const link = screen.getByTestId("certificate-public-view");
    expect(link).toHaveAttribute("href", pageUrl);
    expect(link.getAttribute("href")).not.toContain("Секретное");
  });

  it("copy code writes displayCode to clipboard", async () => {
    const user = userEvent.setup();
    await renderCard("default", { displayCode: "А-RC-STORE01" });
    await user.click(screen.getByRole("button", { name: "Скопировать код" }));
    expect(await screen.findByRole("button", { name: "Код скопирован" })).toBeInTheDocument();
    expect(screen.getByTestId("certificate-code")).toHaveTextContent("А-RC-STORE01");
  });

  it("PDF download never sends privateAlias to API, QR, link, or filename", async () => {
    const alias = "ПРИВАТНЫЙ-АЛИАС-QA";
    const encodedAlias = encodeURIComponent(alias);
    const user = userEvent.setup();
    let downloadName = "";
    vi.mocked(remcardFetchBlob).mockResolvedValue({
      blob: new Blob(["%PDF"], { type: "application/pdf" }),
      filename: "remcard-RC-STORE01.pdf",
    });
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
    });

    render(
      <CertificateResultView
        certificate={storeStyleCert()}
        displayCode="М-RC-STORE01"
        privateAlias={alias}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("client-certificate-card-qr")).toBeInTheDocument();
    });

    expect(QRCode.toDataURL).toHaveBeenCalledWith(pageUrl, expect.objectContaining({ width: 128 }));
    const qrArg = vi.mocked(QRCode.toDataURL).mock.calls.at(-1)?.[0] as string;
    expect(qrArg).not.toContain(alias);
    expect(qrArg).not.toContain(encodedAlias);

    const publicLink = screen.getByTestId("certificate-public-view");
    expect(publicLink.getAttribute("href")).toBe(pageUrl);
    expect(publicLink.getAttribute("href")).not.toContain(alias);

    await user.click(screen.getByRole("button", { name: "Скачать PDF" }));

    await waitFor(() => {
      expect(remcardFetchBlob).toHaveBeenCalledTimes(1);
    });
    expect(remcardFetchBlob).toHaveBeenCalledWith("/api/certificate/RC-STORE01/pdf");
    const pdfPath = vi.mocked(remcardFetchBlob).mock.calls[0]?.[0] as string;
    expect(pdfPath).not.toContain(alias);
    expect(pdfPath).not.toContain(encodedAlias);
    expect(downloadName).not.toContain(alias);

    const aliasNodes = screen.getAllByText(alias);
    expect(aliasNodes).toHaveLength(1);
    const mgmt = screen.getByText("Название для себя").parentElement;
    expect(mgmt).toContainElement(aliasNodes[0]!);
  });
});
