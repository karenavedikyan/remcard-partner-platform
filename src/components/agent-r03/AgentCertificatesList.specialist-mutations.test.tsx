import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";
import { fetchSpecialistIssuerCertificates, patchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";

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

function listMeta(count: number) {
  return {
    page: 1,
    pageSize: 25,
    totalCount: count,
    totalPages: 1,
    activeCount: count,
    archivedCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    sort: "created_desc" as const,
  };
}

function certBRow(userAlias: string | null) {
  return {
    ...rowA,
    id: "cert-b",
    promoCode: "B1",
    displayCode: "S-B1",
    title: "B1",
    userAlias,
  };
}

function tableNameLink(name: string) {
  const table = screen.getByRole("table");
  return within(table).getByRole("link", { name });
}

async function openCreateAndGoToDiscounts(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByTestId("specialist-certificate-create-dialog")).toBeVisible();
  });
  await user.click(
    screen.getByTestId("specialist-certificate-create-step-1").querySelector('input[type=checkbox]')!,
  );
  await user.click(screen.getByRole("button", { name: "Далее: скидки" }));
}

async function submitCreateWithAlias(user: ReturnType<typeof userEvent.setup>, alias: string) {
  await user.click(screen.getByTestId("specialist-certificate-create-alias").querySelector("summary")!);
  await user.type(screen.getByLabelText("Название"), alias);
  await user.click(
    within(screen.getByTestId("specialist-certificate-create-dialog")).getByRole("button", {
      name: "Создать сертификат",
    }),
  );
}

describe("AgentCertificatesList specialist list refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
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
  });

  it("reloads list after certificate POST without manual refresh", async () => {
    let listLoads = 0;
    vi.mocked(fetchSpecialistIssuerCertificates).mockImplementation(async () => {
      listLoads += 1;
      const certificates = listLoads >= 2 ? [rowA, certBRow("Второй")] : [rowA];
      return { certificates, ...listMeta(certificates.length) };
    });
    vi.mocked(patchSpecialistIssuerCertificate).mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    render(<AgentCertificatesList accessMode="specialist" />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-r03-found-count")).toHaveTextContent("Найдено: 1");
    });
    await openCreateAndGoToDiscounts(user);
    await user.click(
      within(screen.getByTestId("specialist-certificate-create-dialog")).getByRole("button", {
        name: "Создать сертификат",
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("agent-r03-found-count")).toHaveTextContent("Найдено: 2");
    });
  });

  it("shows final alias in table after delayed initial alias PATCH", async () => {
    let certBAlias: string | null = null;
    let listLoads = 0;
    let resolvePatch!: () => void;
    const patchGate = new Promise<void>((resolve) => {
      resolvePatch = resolve;
    });

    vi.mocked(fetchSpecialistIssuerCertificates).mockImplementation(async () => {
      listLoads += 1;
      const certificates =
        listLoads === 1 ? [rowA] : [rowA, certBRow(certBAlias)];
      return { certificates, ...listMeta(certificates.length) };
    });

    vi.mocked(patchSpecialistIssuerCertificate).mockImplementation(async () => {
      await patchGate;
      certBAlias = "Личное имя после PATCH";
      return { ok: true };
    });

    const user = userEvent.setup();
    render(<AgentCertificatesList accessMode="specialist" />);
    await waitFor(() => expect(tableNameLink("Первый")).toBeInTheDocument());

    await openCreateAndGoToDiscounts(user);
    await submitCreateWithAlias(user, "Личное имя после PATCH");

    await waitFor(() => {
      expect(tableNameLink("B1")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("specialist-cert-list-name-cert-b")).toHaveTextContent("B1");

    resolvePatch();

    await waitFor(() => {
      expect(tableNameLink("Личное имя после PATCH")).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("table")).queryByRole("link", { name: "B1" }),
    ).not.toBeInTheDocument();
  });

  it("updates table alias after PATCH failure and retry success", async () => {
    let certBAlias: string | null = null;
    let listLoads = 0;
    let patchAttempts = 0;

    vi.mocked(fetchSpecialistIssuerCertificates).mockImplementation(async () => {
      listLoads += 1;
      const certificates =
        listLoads === 1 ? [rowA] : [rowA, certBRow(certBAlias)];
      return { certificates, ...listMeta(certificates.length) };
    });

    vi.mocked(patchSpecialistIssuerCertificate).mockImplementation(async () => {
      patchAttempts += 1;
      if (patchAttempts === 1) {
        throw new RemcardApiError(503, "patch failed");
      }
      certBAlias = "Имя после retry";
      return { ok: true };
    });

    const user = userEvent.setup();
    render(<AgentCertificatesList accessMode="specialist" />);
    await waitFor(() => expect(tableNameLink("Первый")).toBeInTheDocument());

    await openCreateAndGoToDiscounts(user);
    await submitCreateWithAlias(user, "Имя после retry");

    await waitFor(() => expect(tableNameLink("B1")).toBeInTheDocument());
    await waitFor(() => {
      expect(screen.getByTestId("specialist-create-alias-notice")).toBeVisible();
    });

    await user.click(screen.getByTestId("specialist-create-alias-retry"));

    await waitFor(() => {
      expect(tableNameLink("Имя после retry")).toBeInTheDocument();
    });
  });

  it("ignores stale list GET that finishes after a newer refresh", async () => {
    let certBAlias: string | null = null;
    let listLoads = 0;

    vi.mocked(fetchSpecialistIssuerCertificates).mockImplementation(async () => {
      const call = ++listLoads;
      const delayMs = call === 2 ? 120 : 0;
      await new Promise((r) => setTimeout(r, delayMs));
      const certificates = call === 1 ? [rowA] : [rowA, certBRow(certBAlias)];
      return { certificates, ...listMeta(certificates.length) };
    });

    vi.mocked(patchSpecialistIssuerCertificate).mockImplementation(async () => {
      certBAlias = "Актуальное имя";
      return { ok: true };
    });

    const user = userEvent.setup();
    render(<AgentCertificatesList accessMode="specialist" />);
    await waitFor(() => expect(tableNameLink("Первый")).toBeInTheDocument());

    await openCreateAndGoToDiscounts(user);
    await submitCreateWithAlias(user, "Актуальное имя");

    await waitFor(() => {
      expect(tableNameLink("Актуальное имя")).toBeInTheDocument();
    });
    expect(
      within(screen.getByRole("table")).queryByRole("link", { name: "B1" }),
    ).not.toBeInTheDocument();
  });
});
