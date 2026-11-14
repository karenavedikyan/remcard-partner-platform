import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchAgentCertificates } from "@/lib/agent-r03/api";
import { fetchBusinessOwnerCertificates } from "@/lib/business-owner-certificates/api";
import { fetchSpecialistIssuerCertificates } from "@/lib/specialist-certificates/api";
import { businessCertificatesPageCopy } from "@/lib/business-owner-certificates/copy";
import { SPECIALIST_CERTIFICATES_PAGE } from "@/lib/specialist-certificates/copy";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/agent-r03/viewModeStorage", () => ({
  readAgentR03ViewMode: () => "list" as const,
  writeAgentR03ViewMode: vi.fn(),
}));

vi.mock("@/lib/agent-r03/api", () => ({
  fetchAgentCertificates: vi.fn(),
  patchAgentCertificate: vi.fn(),
  deleteAgentCertificate: vi.fn(),
  batchAgentCertificates: vi.fn(),
}));

vi.mock("@/lib/business-owner-certificates/api", () => ({
  fetchBusinessOwnerCertificates: vi.fn(),
  patchBusinessOwnerCertificate: vi.fn(),
  deleteBusinessOwnerCertificate: vi.fn(),
  batchBusinessOwnerCertificates: vi.fn(),
}));

vi.mock("@/lib/specialist-certificates/api", () => ({
  fetchSpecialistIssuerCertificates: vi.fn(),
  patchSpecialistIssuerCertificate: vi.fn(),
  deleteSpecialistIssuerCertificate: vi.fn(),
  batchSpecialistIssuerCertificates: vi.fn(),
}));

const certRow = {
  id: "cert-1",
  promoCode: "G1",
  displayCode: "S-G1",
  title: "Gate cert",
  userAlias: "Gate cert",
  status: "ACTIVE",
  partnerStoreName: "Store",
  categorySummary: "Двери",
  discountPercent: 5,
  createdAt: "2026-10-01T10:00:00.000Z",
  archivedInWorkspace: false,
  hasOrders: false,
  canMutateIssuer: true,
};

function listPayload(active: number, archived = 0, certificates = active ? [certRow] : []) {
  return {
    certificates,
    page: 1,
    pageSize: 25,
    totalCount: active + archived,
    totalPages: 1,
    activeCount: active,
    archivedCount: archived,
    hasNextPage: false,
    hasPrevPage: false,
    sort: "created_desc" as const,
  };
}

function trueZeroPayload() {
  return listPayload(0, 0, []);
}

function tabOptions() {
  const select = screen.getByTestId("agent-r03-show-filter");
  const options = within(select).getAllByRole("option");
  return { active: options[0]!.textContent ?? "", archived: options[1]!.textContent ?? "" };
}

describe("P-StandardCounters tab labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["STORE", "business" as const, 1],
    ["COMPANY", "business" as const, 2],
  ])("business %s populated list shows numeric tab counts", async (partnerType, _mode, active) => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listPayload(active));
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType={partnerType as "STORE" | "COMPANY"}>
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("agent-r03-show-filter")).toBeVisible());
    const tabs = tabOptions();
    expect(tabs.active).toBe(`Активные (${active})`);
    expect(tabs.archived).toBe("Архив (0)");
  });

  it("specialist populated list shows numeric tab counts", async () => {
    vi.mocked(fetchSpecialistIssuerCertificates).mockResolvedValue(listPayload(2, 1));
    render(<AgentCertificatesList accessMode="specialist" />);
    await waitFor(() => expect(screen.getByTestId("agent-r03-show-filter")).toBeVisible());
    const tabs = tabOptions();
    expect(tabs.active).toBe("Активные (2)");
    expect(tabs.archived).toBe("Архив (1)");
  });

  it("agent populated list shows numeric tab counts", async () => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue(listPayload(3, 2));
    render(<AgentCertificatesList accessMode="agent" />);
    await waitFor(() => expect(screen.getByTestId("agent-r03-show-filter")).toBeVisible());
    const tabs = tabOptions();
    expect(tabs.active).toBe("Активные (3)");
    expect(tabs.archived).toBe("Архив (2)");
  });

  it("trustworthy zero keeps onboarding empty (toolbar hidden)", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(trueZeroPayload());
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.queryByTestId("agent-r03-show-filter")).not.toBeInTheDocument();
  });

  it.each([
    ["missing activeCount", { activeCount: undefined }],
    ["string activeCount", { activeCount: "1" as unknown as number }],
    ["negative activeCount", { activeCount: -1 }],
    ["NaN archivedCount", { archivedCount: Number.NaN }],
  ])("malformed meta %s shows dashes on tabs", async (_label, patch) => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue({
      ...listPayload(1),
      ...patch,
    });
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("agent-r03-show-filter")).toBeVisible());
    const tabs = tabOptions();
    if ("activeCount" in patch && patch.activeCount !== 1) {
      expect(tabs.active).toContain("—");
    }
    if ("archivedCount" in patch && patch.archivedCount !== 0) {
      expect(tabs.archived).toContain("—");
    }
    if ("activeCount" in patch && patch.activeCount === undefined) {
      expect(tabs.active).toBe("Активные (—)");
    }
  });

  it("search-filtered empty still shows workspace tab totals from API", async () => {
    const copy = businessCertificatesPageCopy({ partnerType: "STORE" });
    vi.mocked(fetchBusinessOwnerCertificates).mockImplementation(async (params) => {
      if (params?.q) {
        return { ...listPayload(0), activeCount: 2, archivedCount: 0, certificates: [] };
      }
      return { ...listPayload(2), certificates: [certRow] };
    });
    const user = userEvent.setup();
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    await user.type(screen.getByPlaceholderText(copy.searchPlaceholder), "zz-no-match");
    await waitFor(() => expect(screen.getByTestId("business-certificates-empty")).toBeVisible());
    const tabs = tabOptions();
    expect(tabs.active).toBe("Активные (2)");
    expect(tabs.archived).toBe("Архив (0)");
  });

  it("archive scope requests archived list and preserves tab counts", async () => {
    vi.mocked(fetchSpecialistIssuerCertificates).mockImplementation(async (params) => {
      const workspaceTotals = { activeCount: 1, archivedCount: 4 };
      if (params?.archived) {
        return { ...listPayload(0, 0, []), ...workspaceTotals };
      }
      return { ...listPayload(1, 4), ...workspaceTotals };
    });
    const user = userEvent.setup();
    render(<AgentCertificatesList accessMode="specialist" />);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(tabOptions().archived).toBe("Архив (4)");
    await user.selectOptions(screen.getByTestId("agent-r03-show-filter"), "archived");
    await waitFor(() =>
      expect(fetchSpecialistIssuerCertificates).toHaveBeenCalledWith(
        expect.objectContaining({ archived: true }),
      ),
    );
    expect(tabOptions().archived).toBe("Архив (4)");
  });

  it("stale fetch does not overwrite tab counts after newer search resolves", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let resolveSlow!: (value: ReturnType<typeof listPayload>) => void;
    const slowPromise = new Promise<ReturnType<typeof listPayload>>((resolve) => {
      resolveSlow = resolve;
    });
    const specialistCopy = SPECIALIST_CERTIFICATES_PAGE.searchPlaceholder;

    vi.mocked(fetchSpecialistIssuerCertificates).mockImplementation((params) => {
      if (params?.q === "slow-query") return slowPromise;
      if (params?.q === "fast-query") {
        return Promise.resolve(listPayload(5, 2));
      }
      return Promise.resolve(listPayload(1, 0));
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<AgentCertificatesList accessMode="specialist" />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    await waitFor(() => expect(tabOptions().active).toBe("Активные (1)"));

    const search = screen.getByPlaceholderText(specialistCopy);
    await user.clear(search);
    await user.type(search, "slow-query");
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    await user.clear(search);
    await user.type(search, "fast-query");
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await waitFor(() => expect(tabOptions().active).toBe("Активные (5)"));

    resolveSlow(listPayload(9, 9));
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(tabOptions().active).toBe("Активные (5)");
    expect(tabOptions().archived).toBe("Архив (2)");
  });
});