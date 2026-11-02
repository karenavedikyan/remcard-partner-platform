import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cert, meta } from "../../../scripts/reward-lifecycle-qa/purchase-fixtures";
import { AgentCertificateDetail } from "./AgentCertificateDetail";
import { SpecialistCertificateDetailDialog } from "@/components/specialist-certificates/SpecialistCertificateDetailDialog";
import { CertificateDetail } from "@/components/recommendations/CertificateDetail";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ remcardFetch: vi.fn(), RemcardApiError: class extends Error {
  constructor(_status: number, message: string) { super(message); }
} }));
vi.mock("@/lib/agent-r03/api", () => ({ fetchAgentCertificate: vi.fn(async () => ({ certificate: meta })) }));
vi.mock("@/lib/business-owner-certificates/issuer-api", () => ({ fetchIssuerCertificate: vi.fn(async () => ({ certificate: meta })) }));
vi.mock("@/components/recommendations/CertificateResultView", () => ({
  CertificateResultView: () => <p>QR и ссылка сохранены</p>,
}));
vi.mock("@/components/agent-r03/SharePreviewDialog", () => ({ SharePreviewDialog: () => null }));
vi.mock("@/components/agent-r03/SpecialistCertificateEditDiscountsDialog", () => ({ SpecialistCertificateEditDiscountsDialog: () => null }));
vi.mock("@/components/specialist-certificates/SpecialistCertificateEditDetailsDialog", () => ({ SpecialistCertificateEditDetailsDialog: () => null }));

describe("all partner certificate detail entrypoints", () => {
  beforeEach(() => { vi.mocked(remcardFetch).mockReset().mockResolvedValue(cert); });
  it.each(["AGENT", "SPECIALIST", "STORE", "COMPANY", "fallback"])("%s consumes actual certificate GET orders", async kind => {
    render(kind === "AGENT" ? <AgentCertificateDetail certificateId={cert.id} />
      : kind === "fallback" ? <CertificateDetail certificateId={cert.id} />
      : <SpecialistCertificateDetailDialog open certificateId={cert.id}
          issuerListApi={kind === "SPECIALIST" ? "specialist" : "business"} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Покупки по сертификату (2)" })).toBeVisible());
    expect(remcardFetch).toHaveBeenCalledWith(`/api/store/certificate/${cert.id}`);
    expect(screen.getAllByRole("link", { name: "Открыть полную карточку покупки" })).toHaveLength(2);
    expect(screen.getByText("QR и ссылка сохранены")).toBeVisible();
  });
  it.each(["AGENT", "SPECIALIST", "STORE", "COMPANY"])("%s cannot show a denied foreign certificate", async kind => {
    vi.mocked(remcardFetch).mockRejectedValue(new RemcardApiError(403, "Нет доступа"));
    render(kind === "AGENT" ? <AgentCertificateDetail certificateId="foreign" />
      : <SpecialistCertificateDetailDialog open certificateId="foreign"
          issuerListApi={kind === "SPECIALIST" ? "specialist" : "business"} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Нет доступа"));
    expect(screen.queryByRole("heading", { name: /Покупки по сертификату/ })).toBeNull();
  });
});
