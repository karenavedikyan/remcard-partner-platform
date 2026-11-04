import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
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

describe("AgentCertificatesList first paint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pending: no intro, toolbar, or welcome until empty resolves", async () => {
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
});
