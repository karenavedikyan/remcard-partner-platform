import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { fetchAgentCertificates } from "@/lib/agent-r03/api";
import { fetchBusinessOwnerCertificates } from "@/lib/business-owner-certificates/api";
import { fetchSpecialistIssuerCertificates } from "@/lib/specialist-certificates/api";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { RemcardApiError } from "@/lib/api-client";

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

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "RemcardApiError";
    }
  },
}));

function trueZeroResponse() {
  return {
    certificates: [] as const,
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 1,
    activeCount: 0,
    archivedCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    sort: "created_desc" as const,
  };
}

const issuerCertRow = {
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

function listMeta(count: number) {
  return {
    certificates: count ? [issuerCertRow] : [],
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

describe("AgentCertificatesList first paint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pending: no intro, toolbar, or welcome until empty resolves (agent)", async () => {
    let resolveFetch!: (value: ReturnType<typeof trueZeroResponse>) => void;
    vi.mocked(fetchAgentCertificates).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<AgentCertificatesList accessMode="agent" />);

    expect(screen.getByTestId("certificates-welcome-decision-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("agent-r03-collection-toolbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();

    resolveFetch(trueZeroResponse());
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.queryByTestId("certificates-welcome-decision-pending")).not.toBeInTheDocument();
  });

  it.each([
    ["specialist", fetchSpecialistIssuerCertificates] as const,
    ["business", fetchBusinessOwnerCertificates] as const,
  ])(
    "issuer (%s): initial HTTP failure shows alert+retry, not welcome or legacy empty",
    async (_mode, mockFetch) => {
      vi.mocked(mockFetch).mockRejectedValue(new RemcardApiError(500, "Сервер недоступен"));

      if (_mode === "business") {
        render(
          <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
            <AgentCertificatesList accessMode="business" />
          </OwnerIssuerModeProvider>,
        );
      } else {
        render(<AgentCertificatesList accessMode="specialist" />);
      }

      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Сервер недоступен"));
      expect(screen.getByRole("button", { name: /Повторить/i })).toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("business-certificates-empty")).not.toBeInTheDocument();
      expect(screen.queryByTestId("certificates-welcome-decision-pending")).not.toBeInTheDocument();
    },
  );

  it.each([
    ["specialist", fetchSpecialistIssuerCertificates] as const,
    ["business", fetchBusinessOwnerCertificates] as const,
  ])("issuer (%s): initial failure then retry resolves to welcome empty", async (_mode, mockFetch) => {
    const user = userEvent.setup();
    let listCalls = 0;
    vi.mocked(mockFetch).mockImplementation(async () => {
      listCalls += 1;
      if (listCalls === 1) {
        throw new RemcardApiError(500, "Сервер недоступен");
      }
      return trueZeroResponse();
    });

    if (_mode === "business") {
      render(
        <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
          <AgentCertificatesList accessMode="business" />
        </OwnerIssuerModeProvider>,
      );
    } else {
      render(<AgentCertificatesList accessMode="specialist" />);
    }

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Повторить/i }));
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(listCalls).toBe(2);
  });

  it.each([
    [
      "specialist",
      fetchSpecialistIssuerCertificates,
      () => render(<AgentCertificatesList accessMode="specialist" />),
    ] as const,
    [
      "business",
      fetchBusinessOwnerCertificates,
      () =>
        render(
          <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
            <AgentCertificatesList accessMode="business" />
          </OwnerIssuerModeProvider>,
        ),
    ] as const,
  ])(
    "issuer (%s): one GET after nonempty load settles; explicit sort is second GET on failure keeps row",
    async (_mode, mockFetch, renderList) => {
      const user = userEvent.setup();
      let listCalls = 0;
      vi.mocked(mockFetch).mockImplementation(async () => {
        listCalls += 1;
        if (listCalls === 1) {
          return listMeta(1);
        }
        throw new RemcardApiError(500, "Сервер недоступен");
      });

      renderList();
      await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
      await waitFor(() => expect(listCalls).toBe(1));
      expect(screen.getByTestId("agent-r03-found-count")).toHaveTextContent("Найдено: 1");

      await user.selectOptions(screen.getByTestId("agent-r03-sort"), "name_asc");

      await waitFor(() => expect(listCalls).toBe(2));
      expect(screen.getByRole("table")).toBeVisible();
      expect(screen.getByTestId("agent-r03-found-count")).toHaveTextContent("Найдено: 1");
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("certificates-welcome-decision-pending")).not.toBeInTheDocument();
    },
  );

  it("agent: empty welcome resolves with exactly one list GET", async () => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue(trueZeroResponse());
    render(<AgentCertificatesList accessMode="agent" />);
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(vi.mocked(fetchAgentCertificates)).toHaveBeenCalledTimes(1);
  });
});
