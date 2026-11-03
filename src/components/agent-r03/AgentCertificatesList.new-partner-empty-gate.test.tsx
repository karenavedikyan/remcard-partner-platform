import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchAgentCertificates } from "@/lib/agent-r03/api";
import { fetchBusinessOwnerCertificates } from "@/lib/business-owner-certificates/api";
import { fetchSpecialistIssuerCertificates } from "@/lib/specialist-certificates/api";

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

type AccessCase = {
  mode: "agent" | "specialist" | "business";
  mockFetch: typeof fetchAgentCertificates;
  render: () => ReturnType<typeof render>;
};

const accessCases: AccessCase[] = [
  {
    mode: "agent",
    mockFetch: fetchAgentCertificates,
    render: () => render(<AgentCertificatesList accessMode="agent" />),
  },
  {
    mode: "specialist",
    mockFetch: fetchSpecialistIssuerCertificates,
    render: () =>
      render(
        <OwnerIssuerModeProvider mode="specialist">
          <AgentCertificatesList accessMode="specialist" />
        </OwnerIssuerModeProvider>,
      ),
  },
  {
    mode: "business",
    mockFetch: fetchBusinessOwnerCertificates,
    render: () =>
      render(
        <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
          <AgentCertificatesList accessMode="business" />
        </OwnerIssuerModeProvider>,
      ),
  },
];

describe.each(accessCases)("$mode", ({ mockFetch, render: renderCase }) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("true zero: no toolbar search, found count, or duplicate legacy create", async () => {
    vi.mocked(mockFetch).mockResolvedValue(trueZeroResponse());
    renderCase();
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.queryByTestId("agent-r03-collection-toolbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-r03-search")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-r03-found-count")).not.toBeInTheDocument();
    expect(screen.queryByTestId("business-certificates-create-cta")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("es-создать-сертификат")).toHaveLength(1);
  });
});

describe("AgentCertificatesList new-partner gate negative (agent)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["missing activeCount", { ...trueZeroResponse(), activeCount: undefined }],
    ["missing archivedCount", { ...trueZeroResponse(), archivedCount: undefined }],
    ["missing totalCount", { ...trueZeroResponse(), totalCount: undefined }],
    ["string totalCount", { ...trueZeroResponse(), totalCount: "0" as unknown as number }],
    ["nonzero total with empty items", { ...trueZeroResponse(), totalCount: 5 }],
    ["missing certificates array", { ...trueZeroResponse(), certificates: undefined }],
  ] as const)("does not show onboarding when %s", async (_label, payload) => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue(payload as ReturnType<typeof trueZeroResponse>);
    render(<AgentCertificatesList accessMode="agent" />);
    await waitFor(() => expect(screen.getByTestId("business-certificates-empty")).toBeVisible());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-r03-search")).toBeInTheDocument();
  });
});
