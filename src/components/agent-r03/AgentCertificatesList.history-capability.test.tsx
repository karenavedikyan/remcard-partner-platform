import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchBusinessOwnerCertificates } from "@/lib/business-owner-certificates/api";

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

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("@/lib/business-owner-certificates/api", () => ({
  fetchBusinessOwnerCertificates: vi.fn(),
  patchBusinessOwnerCertificate: vi.fn(),
  deleteBusinessOwnerCertificate: vi.fn(),
  batchBusinessOwnerCertificates: vi.fn(),
}));

import { remcardFetch } from "@/lib/api-client";

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
    knownCounts: { active: 0, archived: 0, total: 0 },
  };
}

describe("AgentCertificatesList canLinkOnboardingHistory prop", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(trueZeroResponse());
  });

  it("does not call remcardFetch when business empty renders without prop", async () => {
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
    expect(vi.mocked(remcardFetch)).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /Открыть историю/i })).toBeNull();
  });

  it("links history step when canLinkOnboardingHistory is true", async () => {
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE" canLinkOnboardingHistory>
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
    expect(vi.mocked(remcardFetch)).not.toHaveBeenCalled();
    expect(
      await screen.findByRole("link", { name: /Продажа подтверждена.*Открыть историю/i }),
    ).toHaveAttribute("href", "/history");
  });
});
