import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cert, meta } from "../../../scripts/reward-lifecycle-qa/purchase-fixtures";
import { AgentCertificateDetail } from "./AgentCertificateDetail";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { remcardFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class extends Error {
    constructor(_status: number, message: string) {
      super(message);
    }
  },
}));
vi.mock("@/lib/agent-r03/api", () => ({
  fetchAgentCertificate: vi.fn(async () => ({ certificate: meta })),
  patchAgentCertificate: vi.fn(),
  deleteAgentCertificate: vi.fn(),
}));
vi.mock("@/components/recommendations/CertificateResultView", () => ({
  CertificateResultView: () => <p>QR</p>,
}));
vi.mock("@/components/agent-r03/SharePreviewDialog", () => ({ SharePreviewDialog: () => null }));
vi.mock("@/components/agent-r03/SpecialistCertificateEditDiscountsDialog", () => ({
  SpecialistCertificateEditDiscountsDialog: () => null,
}));

beforeEach(() => {
  vi.mocked(remcardFetch).mockReset().mockResolvedValue(cert);
});

describe("AgentCertificateDetail for the agent's employee", () => {
  it("shows the certificate and share only: no rename, archive, disable or delete", async () => {
    render(
      <OwnerIssuerModeProvider mode="legacy" canIssueCertificates agentEmployee employerLabel="Агент Иван">
        <AgentCertificateDetail certificateId={cert.id} />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /Поделиться/ })).toBeVisible());
    expect(screen.queryByRole("button", { name: /Переименовать/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /архив/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Отключить/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Удалить/ })).not.toBeInTheDocument();
  });

  it("regression: the agent owner keeps the full action set", async () => {
    render(<AgentCertificateDetail certificateId={cert.id} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Переименовать/ })).toBeVisible());
    expect(screen.getByRole("button", { name: /Удалить/ })).toBeInTheDocument();
  });
});
