import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificateCreateForm } from "./CertificateCreateForm";
import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import { patchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";

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

const partnerRow = {
  partnershipId: "part-1",
  storeUserId: "store-1",
  storeName: "Test Store",
  displayName: "Store",
  partnerType: "STORE" as const,
  partnerCategories: ["doors"],
  city: "Город",
  isSelfScan: false,
  categories: [
    {
      category: "doors",
      categoryLabel: "Двери",
      poolPercent: 10,
      discountPercent: 5,
      issuerPercent: 5,
      proBonusPercent: 0,
      maxDiscount: 10,
      maxBonus: 10,
      maxTotal: 10,
    },
  ],
  programReady: true,
  programMissing: [],
};

const createdCert = {
  id: "cert-created-1",
  promoCode: "RC-NEW",
  qrCode: "qr-new",
  status: "ACTIVE",
  validUntil: null,
  maxUsages: 0,
  usageCount: 0,
  createdAt: "2026-10-21T12:00:00.000Z",
};

function mockReadyForm() {
  vi.mocked(getAuthMe).mockResolvedValue({
    user: { id: "u1", role: "PRO", displayName: "Tester" },
  } as Awaited<ReturnType<typeof getAuthMe>>);
  vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
    if (path === "/api/store/certificate/available-partners") {
      return {
        partners: [partnerRow],
        certificateRecommendationIssuerReady: true,
        certificateRecommendationIssuerMissing: [],
      };
    }
    if (path === "/api/pro/context") {
      return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
    }
    if (path === "/api/store/certificate" && init?.method === "POST") {
      return createdCert;
    }
    throw new Error(`unexpected path ${path}`);
  });
}

async function goToSpecialistStep2(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByTestId("specialist-certificate-create-step-1")).toBeVisible();
  });
  await user.click(screen.getByTestId("specialist-certificate-create-step-1").querySelector('input[type=checkbox]')!);
  await user.click(screen.getByRole("button", { name: "Далее: скидки" }));
  await waitFor(() => {
    expect(screen.getByTestId("specialist-certificate-create-step-2")).toBeVisible();
  });
  const discountInput = screen.getAllByLabelText("Скидка клиенту, %")[0]!;
  await user.clear(discountInput);
  await user.type(discountInput, "5");
}

describe("CertificateCreateForm specialist alias submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockReadyForm();
  });

  it("shows success when POST ok and alias PATCH ok (single POST, single PATCH)", async () => {
    vi.mocked(patchSpecialistIssuerCertificate).mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);

    await goToSpecialistStep2(user);
    await user.type(screen.getByLabelText("Название"), "Моё имя");
    await user.click(screen.getByRole("button", { name: "Создать сертификат" }));

    await waitFor(() => {
      expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument();
    });
    expect(remcardFetch).toHaveBeenCalledWith(
      "/api/store/certificate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(vi.mocked(remcardFetch).mock.calls.filter((c) => c[0] === "/api/store/certificate" && c[1]?.method === "POST")).toHaveLength(1);
    expect(patchSpecialistIssuerCertificate).toHaveBeenCalledTimes(1);
    expect(patchSpecialistIssuerCertificate).toHaveBeenCalledWith("cert-created-1", {
      userAlias: "Моё имя",
    });
  });

  it("keeps created result when alias PATCH fails and retry PATCH does not POST again", async () => {
    vi.mocked(patchSpecialistIssuerCertificate)
      .mockRejectedValueOnce(new RemcardApiError(503, "Service unavailable"))
      .mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);

    await goToSpecialistStep2(user);
    await user.type(screen.getByLabelText("Название"), "Черновое имя");
    await user.click(screen.getByRole("button", { name: "Создать сертификат" }));

    await waitFor(() => {
      expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument();
    });
    expect(screen.getByTestId("specialist-create-alias-notice")).toHaveTextContent(
      /Сертификат создан, но название не сохранилось/,
    );

    const postCalls = vi
      .mocked(remcardFetch)
      .mock.calls.filter((c) => c[0] === "/api/store/certificate" && c[1]?.method === "POST");
    expect(postCalls).toHaveLength(1);

    await user.click(screen.getByTestId("specialist-create-alias-retry"));
    await waitFor(() => {
      expect(patchSpecialistIssuerCertificate).toHaveBeenCalledTimes(2);
    });
    expect(postCalls).toHaveLength(1);
    expect(patchSpecialistIssuerCertificate).toHaveBeenLastCalledWith("cert-created-1", {
      userAlias: "Черновое имя",
    });
  });

  it("creates without alias with POST only", async () => {
    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);
    await goToSpecialistStep2(user);
    await user.click(screen.getByRole("button", { name: "Создать сертификат" }));

    await waitFor(() => {
      expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument();
    });
    expect(patchSpecialistIssuerCertificate).not.toHaveBeenCalled();
    expect(
      vi.mocked(remcardFetch).mock.calls.filter((c) => c[0] === "/api/store/certificate" && c[1]?.method === "POST"),
    ).toHaveLength(1);
  });

  it("blocks duplicate submit while pending", async () => {
    let resolvePost: (value: typeof createdCert) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [partnerRow],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      if (path === "/api/pro/context") {
        return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
      }
      if (path === "/api/store/certificate" && init?.method === "POST") {
        return new Promise((resolve) => {
          resolvePost = resolve;
        });
      }
      throw new Error(`unexpected path ${path}`);
    });

    const user = userEvent.setup();
    render(<CertificateCreateForm issuerUi="specialist" />);
    await goToSpecialistStep2(user);

    const createBtn = screen.getByRole("button", { name: "Создать сертификат" });
    await user.click(createBtn);
    await user.click(createBtn);

    resolvePost(createdCert);
    await waitFor(() => {
      expect(screen.getByTestId("recommendation-create-success")).toBeInTheDocument();
    });
    expect(
      vi.mocked(remcardFetch).mock.calls.filter((c) => c[0] === "/api/store/certificate" && c[1]?.method === "POST"),
    ).toHaveLength(1);
  });
});
