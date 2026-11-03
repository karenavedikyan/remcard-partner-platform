import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchAgentCertificates } from "@/lib/agent-r03/api";

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

function listMeta(count: number) {
  return {
    certificates: [],
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

function certRow(id = "c1") {
  return {
    id,
    promoCode: "A1",
    displayCode: "S-A1",
    title: "Test",
    userAlias: "Test",
    status: "ACTIVE" as const,
    partnerStoreName: "Shop",
    categorySummary: "Cat",
    discountPercent: 5,
    createdAt: "2026-01-01T00:00:00.000Z",
    archivedInWorkspace: false,
    hasOrders: false,
  };
}

describe("AgentCertificatesList agent new-partner empty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows onboarding empty without stat cards", async () => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue(listMeta(0));
    render(<AgentCertificatesList accessMode="agent" />);
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.queryByTestId("agent-r03-stat-cards")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-r03-show-filter")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Первый сертификат — за минуту" })).toBeVisible();
  });

  it("keeps list UI when data exists", async () => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue({
      ...listMeta(1),
      certificates: [certRow()],
    });
    render(<AgentCertificatesList accessMode="agent" />);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not show onboarding on filtered empty search", async () => {
    vi.mocked(fetchAgentCertificates).mockImplementation(async (params) => {
      if (params?.q) {
        return { ...listMeta(0), activeCount: 2, archivedCount: 0, certificates: [] };
      }
      return { ...listMeta(2), certificates: [certRow("c1"), certRow("c2")] };
    });
    const user = userEvent.setup();
    render(<AgentCertificatesList accessMode="agent" />);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    await user.type(screen.getByPlaceholderText("Название, партнёр или категория"), "nope");
    await waitFor(() => expect(screen.getByTestId("business-certificates-empty")).toBeVisible());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
