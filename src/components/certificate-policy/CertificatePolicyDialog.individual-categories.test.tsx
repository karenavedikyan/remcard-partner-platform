import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CertificatePolicyDialog } from "./CertificatePolicyDialog";
import type { CertificatePolicyWorkspace } from "@/lib/certificate-policy/types";

vi.mock("@/lib/certificate-policy/api", () => ({
  fetchCertificatePolicyWorkspace: vi.fn(),
  patchCertificatePolicy: vi.fn(),
}));
import * as api from "@/lib/certificate-policy/api";

const rate = (category: string, categoryLabel: string, poolPercent: number) => ({ category, categoryLabel, poolPercent });

function workspace(): CertificatePolicyWorkspace {
  return {
    general: {
      scope: "general", version: 3, categoryRatesRevision: "doors:12|flooring:0|paint:7",
      effective: {
        validityDays: 14, purchaseLimit: 1, minimumPurchaseAmount: null, promotionsCompatible: false,
        exclusionsText: null,
        categoryRates: [rate("doors", "doors", 12), rate("flooring", "flooring", 0), rate("paint", "paint", 7)],
      },
    },
    counterparties: [
      {
        userId: "store-56", displayName: "Магазин 56", roleLabel: "Магазин", initials: "М5",
        status: "general", partnershipId: "ps-in", direction: "incoming", readOnly: false,
        effective: {
          validityDays: 14, purchaseLimit: 1, minimumPurchaseAmount: null, promotionsCompatible: false,
          exclusionsText: null, categoryRates: [rate("paint", "paint", 7)],
        },
        individualVersion: null, categoryRatesRevision: "paint:7",
      },
    ],
    incomingProposals: [],
  } as unknown as CertificatePolicyWorkspace;
}

function openIndividual() {
  render(
    <CertificatePolicyDialog open canEditSettings viewerUserId="company-62" onClose={() => undefined}
      initialScope="individual" initialPartnershipId="ps-in" initialPartnerUserId="store-56" initialTab="settings" />,
  );
}

beforeEach(() => {
  vi.mocked(api.fetchCertificatePolicyWorkspace).mockReset().mockResolvedValue({ ok: true, workspace: workspace() });
  vi.mocked(api.patchCertificatePolicy).mockReset().mockResolvedValue({ ok: true, workspace: workspace() });
});

describe("individual directed conditions edit only the agreed categories", () => {
  it("initializes only the agreed paint7, with the Russian label, not the general doors/flooring/paint list", async () => {
    openIndividual();
    const paint = await screen.findByLabelText("Краска / ЛКМ");
    expect((paint as HTMLInputElement).value).toBe("7");
    expect(screen.queryByLabelText("Двери")).toBeNull();
    expect(screen.queryByLabelText("Напольные покрытия")).toBeNull();
    expect(document.querySelectorAll('input[name^="rate-"]')).toHaveLength(1);
  });

  it("changing only days/purchases sends the unchanged agreed category set and rates", async () => {
    openIndividual();
    const days = await screen.findByTestId("cp-days");
    await waitFor(() => expect((days as HTMLInputElement).value).toBe("14"));
    await userEvent.clear(days);
    await userEvent.type(days, "21");
    await userEvent.click(screen.getByRole("button", { name: /Предложить партнёру/i }));
    const call = vi.mocked(api.patchCertificatePolicy).mock.calls[0][0] as { terms: { categoryRates: unknown[]; validityDays: number } };
    expect(call.terms.validityDays).toBe(21);
    expect(call.terms.categoryRates).toEqual([rate("paint", "paint", 7)]);
  });

  it("paint7 -> paint8 is sent on paint only", async () => {
    openIndividual();
    await waitFor(() => expect((screen.getByTestId("cp-days") as HTMLInputElement).value).toBe("14"));
    const paint = await screen.findByLabelText("Краска / ЛКМ");
    await userEvent.clear(paint);
    await userEvent.type(paint, "8");
    await userEvent.click(screen.getByRole("button", { name: /Предложить партнёру/i }));
    const call = vi.mocked(api.patchCertificatePolicy).mock.calls[0][0] as { terms: { categoryRates: unknown[] } };
    expect(call.terms.categoryRates).toEqual([rate("paint", "paint", 8)]);
  });

  it("keeps the general editor on the full owner published list", async () => {
    render(<CertificatePolicyDialog open canEditSettings viewerUserId="company-62" onClose={() => undefined} initialTab="settings" />);
    expect(await screen.findByLabelText("Двери")).toBeInTheDocument();
    expect(screen.getByLabelText("Напольные покрытия")).toBeInTheDocument();
    expect(screen.getByLabelText("Краска / ЛКМ")).toBeInTheDocument();
  });
});
