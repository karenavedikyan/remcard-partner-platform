import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { getAuthMe, remcardFetch } from "@/lib/api-client";
import { fetchSpecialistIssuerCertificates } from "@/lib/specialist-certificates/api";
import { patchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("create=1"),
}));

vi.mock("@/lib/agent-r03/viewModeStorage", () => ({
  readAgentR03ViewMode: () => "list" as const,
  writeAgentR03ViewMode: vi.fn(),
}));

vi.mock("@/lib/specialist-certificates/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/specialist-certificates/api")>();
  return {
    ...actual,
    fetchSpecialistIssuerCertificates: vi.fn(),
    patchSpecialistIssuerCertificate: vi.fn(),
  };
});

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

const rowA = {
  id: "cert-a",
  promoCode: "A1",
  displayCode: "S-A1",
  title: "Первый",
  userAlias: "Первый",
  status: "ACTIVE",
  partnerStoreName: "Store",
  categorySummary: "Двери",
  discountPercent: 5,
  createdAt: "2026-10-01T10:00:00.000Z",
  archivedInWorkspace: false,
  hasOrders: false,
};

const partner = {
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
  ],
};

describe("AgentCertificatesList specialist list refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    let listLoads = 0;
    vi.mocked(fetchSpecialistIssuerCertificates).mockImplementation(async () => {
      listLoads += 1;
      const certificates = listLoads >= 2 ? [rowA, { ...rowA, id: "cert-b", title: "Второй", userAlias: "Второй" }] : [rowA];
      return {
        certificates,
        page: 1,
        pageSize: 25,
        totalCount: certificates.length,
        totalPages: 1,
        activeCount: certificates.length,
        archivedCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
        sort: "created_desc",
      };
    });
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "u1", role: "PRO", displayName: "Tester" },
    } as Awaited<ReturnType<typeof getAuthMe>>);
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/store/certificate/available-partners") {
        return {
          partners: [partner],
          certificateRecommendationIssuerReady: true,
          certificateRecommendationIssuerMissing: [],
        };
      }
      if (path === "/api/pro/context") {
        return { organization: null, activeBranch: null, role: "SOLO", branches: [] };
      }
      if (path === "/api/store/certificate" && init?.method === "POST") {
        return {
          id: "cert-b",
          promoCode: "B1",
          qrCode: "qr-b",
          status: "ACTIVE",
          validUntil: null,
          maxUsages: 0,
          usageCount: 0,
          createdAt: new Date().toISOString(),
          certificateUrl: "https://remcard.test/certificate/qr-b",
          partners: [],
        };
      }
      throw new Error(`unexpected ${path}`);
    });
    vi.mocked(patchSpecialistIssuerCertificate).mockResolvedValue({ ok: true });
  });

  it("reloads list after certificate POST without manual refresh", async () => {
    const user = userEvent.setup();
    render(<AgentCertificatesList accessMode="specialist" />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-r03-found-count")).toHaveTextContent("Найдено: 1");
    });
    await waitFor(() => {
      expect(screen.getByTestId("specialist-certificate-create-dialog")).toBeVisible();
    });
    await user.click(
      screen.getByTestId("specialist-certificate-create-step-1").querySelector('input[type=checkbox]')!,
    );
    await user.click(screen.getByRole("button", { name: "Далее: скидки" }));
    await user.click(
      within(screen.getByTestId("specialist-certificate-create-dialog")).getByRole("button", {
        name: "Создать сертификат",
      }),
    );
    await waitFor(() => {
      expect(fetchSpecialistIssuerCertificates).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(screen.getByTestId("agent-r03-found-count")).toHaveTextContent("Найдено: 2");
    });
  });
});
