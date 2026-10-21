import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCreateForm } from "./CertificateCreateForm";
import { getAuthMe, remcardFetch } from "@/lib/api-client";

vi.mock("./CertificateResultView", () => ({
  CertificateResultView: () => <div data-testid="recommendation-create-success" />,
}));

vi.mock("@/lib/specialist-certificates/api", () => ({
  patchSpecialistIssuerCertificate: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  getAuthMe: vi.fn(),
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const twoCategoryPartner = {
  partnershipId: "part-1",
  storeUserId: "store-1",
  storeName: "Test Store",
  city: "Москва",
  isSelfScan: false,
  programReady: true,
  categories: [
    {
      category: "doors",
      categoryLabel: "Двери",
      poolPercent: 10,
      discountPercent: 5,
      issuerPercent: 5,
    },
    {
      category: "windows",
      categoryLabel: "Окна",
      poolPercent: 8,
      discountPercent: 4,
      issuerPercent: 4,
    },
  ],
};

describe("CertificateCreateForm specialist create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "u1", role: "PRO", displayName: "Tester" },
    } as Awaited<ReturnType<typeof getAuthMe>>);
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [twoCategoryPartner],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      if (path === "/api/pro/context") {
        return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
      }
      if (path === "/api/store/certificate" && init?.method === "POST") {
        return { id: "cert-1", promoCode: "RC-1", qrCode: "qr", status: "ACTIVE" };
      }
      throw new Error(`unexpected ${path}`);
    });
  });

  it("filters partners by search and keeps selection count", async () => {
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" presentation="page" />);
    await waitFor(() => {
      expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible();
    });
    const checkbox = screen.getByTestId("specialist-certificate-create-step-1").querySelector('input[type=checkbox]')!;
    await user.click(checkbox);
    expect(screen.getByTestId("specialist-cert-selected-count")).toHaveTextContent("Выбрано: 1");
    await user.type(screen.getByTestId("specialist-cert-partner-search"), "нет такого");
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByTestId("specialist-cert-selected-count")).toHaveTextContent("Выбрано: 1");
    await user.clear(screen.getByTestId("specialist-cert-partner-search"));
    await user.type(screen.getByTestId("specialist-cert-partner-search"), "Москва");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("POST includes only selected category", async () => {
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" presentation="page" />);
    await waitFor(() => {
      expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible();
    });
    await user.click(screen.getByTestId("specialist-certificate-create-step-1").querySelector('input[type=checkbox]')!);
    await user.click(screen.getByRole("button", { name: "Далее: скидки" }));
    await user.click(screen.getByTestId("specialist-cert-category-store-1::doors"));
    await user.click(screen.getByRole("button", { name: "Создать сертификат" }));

    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith(
        "/api/store/certificate",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            partners: [
              expect.objectContaining({
                storeUserId: "store-1",
                categories: [expect.objectContaining({ category: "doors" })],
              }),
            ],
          }),
        }),
      );
    });
    const postCall = vi
      .mocked(remcardFetch)
      .mock.calls.find((c) => c[0] === "/api/store/certificate" && c[1]?.method === "POST");
    const body = postCall?.[1]?.body as { partners: Array<{ categories: unknown[] }> };
    expect(body.partners[0]?.categories).toHaveLength(1);
  });
});
