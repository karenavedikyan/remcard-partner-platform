import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CertificatePolicyDialog } from "./CertificatePolicyDialog";
import type { CertificatePolicyTerms, CertificatePolicyWorkspace } from "@/lib/certificate-policy/types";

vi.mock("@/lib/certificate-policy/api", () => ({
  fetchCertificatePolicyWorkspace: vi.fn(),
  patchCertificatePolicy: vi.fn(),
}));
import * as api from "@/lib/certificate-policy/api";

const terms = (validityDays: number, rate: number): CertificatePolicyTerms => ({
  validityDays,
  purchaseLimit: 1,
  minimumPurchaseAmount: null,
  promotionsCompatible: false,
  exclusionsText: null,
  categoryRates: [{ category: "paint", categoryLabel: "Краски", poolPercent: rate }],
});

function workspace(withProposal: boolean): CertificatePolicyWorkspace {
  return {
    general: { scope: "general", version: 1, categoryRatesRevision: "paint:7", effective: terms(30, 7) },
    counterparties: [],
    incomingProposals: withProposal
      ? [
          {
            id: "prop1",
            version: 3,
            proposerUserId: "partner",
            receiverUserId: "owner",
            createdAt: "2026-02-01T00:00:00.000Z",
            proposed: terms(21, 8),
            effective: terms(14, 7),
          },
        ]
      : [],
  };
}

function mount(onChanged: () => void, tab: "settings" | "incoming") {
  return render(
    <CertificatePolicyDialog
      open
      initialTab={tab}
      canEditSettings
      viewerUserId="owner"
      onClose={() => undefined}
      onEffectiveTermsChanged={onChanged}
    />,
  );
}

describe("CertificatePolicyDialog onEffectiveTermsChanged", () => {
  beforeEach(() => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockReset();
    vi.mocked(api.patchCertificatePolicy).mockReset();
  });

  it("fires once after a successful approval", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: true, workspace: workspace(true) });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({ ok: true, workspace: workspace(false) });
    const onChanged = vi.fn();
    mount(onChanged, "incoming");
    await userEvent.click(await screen.findByTestId("cp-approve-prop1"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  });

  it("does not fire for a rejection, a failed approval, or while the proposal is only pending", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: true, workspace: workspace(true) });
    const onChanged = vi.fn();
    mount(onChanged, "incoming");
    await screen.findByTestId("cp-approve-prop1");
    expect(onChanged).not.toHaveBeenCalled();

    vi.mocked(api.patchCertificatePolicy).mockResolvedValueOnce({
      ok: false,
      code: "VERSION_CONFLICT",
      message: "stale",
    });
    await userEvent.click(screen.getByTestId("cp-approve-prop1"));
    await waitFor(() => expect(screen.getByTestId("cp-status").textContent).toContain("stale"));
    expect(onChanged).not.toHaveBeenCalled();

    vi.mocked(api.patchCertificatePolicy).mockResolvedValueOnce({ ok: true, workspace: workspace(false) });
    await userEvent.click(screen.getByTestId("cp-reject-prop1"));
    await waitFor(() => expect(screen.getByTestId("cp-status").textContent).toContain("Отклонено"));
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("fires after a successful general save", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: true, workspace: workspace(false) });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({ ok: true, workspace: workspace(false) });
    const onChanged = vi.fn();
    mount(onChanged, "settings");
    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByTestId("cp-save"));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(vi.mocked(api.patchCertificatePolicy).mock.calls[0]![0]).toMatchObject({ action: "save_general" });
  });

  it("does not fire for a failed general save", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: true, workspace: workspace(false) });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({ ok: false, code: "ERROR", message: "boom" });
    const onChanged = vi.fn();
    mount(onChanged, "settings");
    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByTestId("cp-save"));
    await waitFor(() => expect(api.patchCertificatePolicy).toHaveBeenCalled());
    expect(onChanged).not.toHaveBeenCalled();
  });
});
