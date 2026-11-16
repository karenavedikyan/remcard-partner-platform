import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CertificatePolicyDialog } from "./CertificatePolicyDialog";
import type {
  CertificatePolicyCounterparty,
  CertificatePolicyWorkspace,
} from "@/lib/certificate-policy/types";

vi.mock("@/lib/certificate-policy/api", () => ({
  fetchCertificatePolicyWorkspace: vi.fn(),
  patchCertificatePolicy: vi.fn(),
}));
import * as api from "@/lib/certificate-policy/api";

function row(
  partnershipId: string,
  direction: "incoming" | "outgoing",
  days: number,
  limit: number,
  percent: number,
  extra: Partial<CertificatePolicyCounterparty> = {},
): CertificatePolicyCounterparty {
  return {
    userId: "partner-1",
    displayName: "Взаимный партнёр",
    roleLabel: "Компания",
    initials: "ВП",
    status: direction === "incoming" ? "individual" : "general",
    partnershipId,
    direction,
    readOnly: direction === "outgoing",
    effective: {
      validityDays: days, purchaseLimit: limit, minimumPurchaseAmount: null,
      promotionsCompatible: false, exclusionsText: null,
      categoryRates: [{ category: "doors", categoryLabel: "Двери", poolPercent: percent }],
    },
    individualVersion: 1,
    categoryRatesRevision: `${partnershipId}:${percent}`,
    ...extra,
  } as CertificatePolicyCounterparty;
}

function workspace(): CertificatePolicyWorkspace {
  return {
    general: {
      scope: "general", version: 3, categoryRatesRevision: "doors:15.0",
      effective: {
        validityDays: 30, purchaseLimit: 1, minimumPurchaseAmount: null, promotionsCompatible: false,
        exclusionsText: null, categoryRates: [{ category: "doors", categoryLabel: "Двери", poolPercent: 15 }],
      },
    },
    counterparties: [
      row("row-in", "incoming", 45, 3, 12),
      row("row-out", "outgoing", 10, 7, 4),
    ],
    incomingProposals: [],
  } as unknown as CertificatePolicyWorkspace;
}

beforeEach(() => {
  vi.mocked(api.fetchCertificatePolicyWorkspace).mockReset().mockResolvedValue({ ok: true, workspace: workspace() });
  vi.mocked(api.patchCertificatePolicy).mockReset().mockResolvedValue({ ok: true, workspace: workspace() });
});

describe("CertificatePolicyDialog with mutual directed rows", () => {
  it("edits only the receiving row and keeps the issuing row out of the editor", async () => {
    render(<CertificatePolicyDialog open canEditSettings viewerUserId="me" onClose={() => undefined} />);
    await userEvent.click(await screen.findByText("Для партнёра"));
    const days = await screen.findByTestId("cp-days");
    expect((days as HTMLInputElement).value).toBe("45");
    expect(screen.queryByRole("button", { name: /Взаимный партнёр.*(10|7)/ })).toBeNull();
  });

  it("sends partnershipId with propose_individual", async () => {
    render(
      <CertificatePolicyDialog open canEditSettings viewerUserId="me" onClose={() => undefined}
        initialScope="individual" initialPartnershipId="row-in" initialPartnerUserId="partner-1" initialTab="settings" />,
    );
    await waitFor(() => expect((screen.getByTestId("cp-days") as HTMLInputElement).value).toBe("45"));
    const days = screen.getByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "50");
    await userEvent.click(screen.getByRole("button", { name: /Предложить партнёру/i }));
    expect(api.patchCertificatePolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "propose_individual",
        counterpartyUserId: "partner-1",
        partnershipId: "row-in",
        counterpartyCategoryRatesRevision: "row-in:12",
      }),
    );
  });

  it("lists the issuing row read-only on the incoming tab with its own terms", async () => {
    render(<CertificatePolicyDialog open canEditSettings={false} viewerUserId="me" onClose={() => undefined} initialTab="incoming" />);
    const issuing = await screen.findByTestId("cp-issuing-terms");
    expect(issuing).toHaveTextContent("Взаимный партнёр");
    expect(issuing).toHaveTextContent("7");
    expect(issuing).toHaveTextContent("4%");
    expect(issuing.querySelector("input")).toBeNull();
  });
});
