import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CertificatePolicyDialog } from "./CertificatePolicyDialog";
import type { CertificatePolicyWorkspace } from "@/lib/certificate-policy/types";

const workspaceFixture = (): CertificatePolicyWorkspace => ({
  general: {
    scope: "general",
    version: 3,
    categoryRatesRevision: "doors:15.0",
    effective: {
      validityDays: 30,
      purchaseLimit: 1,
      minimumPurchaseAmount: null,
      promotionsCompatible: false,
      exclusionsText: null,
      categoryRates: [{ category: "doors", categoryLabel: "Двери", poolPercent: 15 }],
    },
  },
  counterparties: [
    {
      userId: "p1",
      displayName: "Store A",
      roleLabel: "Магазин",
      initials: "SA",
      status: "general",
      partnershipId: "ps1",
      effective: {
        validityDays: 30,
        purchaseLimit: 2,
        minimumPurchaseAmount: null,
        promotionsCompatible: false,
        exclusionsText: null,
        categoryRates: [{ category: "doors", categoryLabel: "Двери", poolPercent: 15 }],
      },
      individualVersion: 1,
      categoryRatesRevision: "cp1:15.0",
    },
    {
      userId: "p2",
      displayName: "Store B",
      roleLabel: "Магазин",
      initials: "SB",
      status: "individual",
      partnershipId: "ps2",
      effective: {
        validityDays: 45,
        purchaseLimit: 3,
        minimumPurchaseAmount: 1000,
        promotionsCompatible: true,
        exclusionsText: null,
        categoryRates: [{ category: "doors", categoryLabel: "Двери", poolPercent: 12 }],
      },
      individualVersion: 2,
      categoryRatesRevision: "cp2:12.0",
    },
  ],
  incomingProposals: [],
});

vi.mock("@/lib/certificate-policy/api", () => ({
  fetchCertificatePolicyWorkspace: vi.fn(),
  patchCertificatePolicy: vi.fn(),
}));

import * as api from "@/lib/certificate-policy/api";

describe("CertificatePolicyDialog", () => {
  beforeEach(() => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockReset();
    vi.mocked(api.patchCertificatePolicy).mockReset();
  });

  it("switches counterparties without resetting scope", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({
      ok: true,
      workspace: workspaceFixture(),
    });

    render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );

    await userEvent.click(await screen.findByText("Для партнёра"));
    await userEvent.click(await screen.findByRole("button", { name: /Store B/i }));
    const days = await screen.findByTestId("cp-days");
    expect((days as HTMLInputElement).value).toBe("45");

    await userEvent.click(await screen.findByRole("button", { name: /Store A/i }));
    expect((await screen.findByTestId("cp-days") as HTMLInputElement).value).toBe("30");
    expect(screen.getByText("Для партнёра").closest("button")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("re-fetches workspace only on fresh open", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({
      ok: true,
      workspace: workspaceFixture(),
    });

    const { rerender } = render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );
    await screen.findByTestId("cp-tab-settings");

    rerender(
      <CertificatePolicyDialog
        open={false}
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );
    rerender(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );
    await waitFor(() => expect(api.fetchCertificatePolicyWorkspace).toHaveBeenCalledTimes(2));
  });

  it("offers OCC refresh on 409 without clearing draft", async () => {
    const ws = workspaceFixture();
    const bumped = workspaceFixture();
    bumped.general.version = 99;
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: true, workspace: bumped });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({
      ok: false,
      code: "VERSION_CONFLICT",
      message: "conflict",
      workspace: bumped,
    });

    render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );
    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByTestId("cp-save"));
    expect(await screen.findByTestId("cp-occ-recover")).toBeInTheDocument();
    expect((days as HTMLInputElement).value).toBe("45");
    await userEvent.click(screen.getByTestId("cp-occ-refresh"));
    await waitFor(() => expect(api.fetchCertificatePolicyWorkspace).toHaveBeenCalledTimes(2));
  });

  it("preserves draft input on save failure (409)", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({
      ok: true,
      workspace: workspaceFixture(),
    });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({
      ok: false,
      code: "VERSION_CONFLICT",
      message: "conflict",
    });

    render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );

    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByTestId("cp-save"));

    await screen.findByTestId("cp-error");
    expect((days as HTMLInputElement).value).toBe("45");
  });

  it("scopes fetch to current viewer and drops stale loads on viewer switch", async () => {
    const wsA = workspaceFixture();
    const wsB = workspaceFixture();
    wsB.general.effective.validityDays = 11;
    let resolveA: (v: { ok: true; workspace: CertificatePolicyWorkspace }) => void;
    const slowA = new Promise<{ ok: true; workspace: CertificatePolicyWorkspace }>((r) => {
      resolveA = r;
    });
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockImplementation(async (actor) => {
      if (actor === "viewer-a") return slowA;
      if (actor === "viewer-b") return { ok: true, workspace: wsB };
      return { ok: true, workspace: wsA };
    });

    const { rerender } = render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="viewer-a"
        onClose={() => undefined}
      />,
    );
    rerender(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="viewer-b"
        onClose={() => undefined}
      />,
    );
    const daysB = await screen.findByTestId("cp-days");
    expect((daysB as HTMLInputElement).value).toBe("11");
    resolveA!({ ok: true, workspace: wsA });
    await waitFor(() => {
      expect((screen.getByTestId("cp-days") as HTMLInputElement).value).toBe("11");
    });
    expect(api.fetchCertificatePolicyWorkspace).toHaveBeenCalledWith("viewer-b");
  });

  it("does not clear dirty when a stale save succeeds after viewer switch", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({
      ok: true,
      workspace: workspaceFixture(),
    });
    let resolvePatch: (v: { ok: true; workspace: CertificatePolicyWorkspace }) => void;
    const patchPending = new Promise<{ ok: true; workspace: CertificatePolicyWorkspace }>((r) => {
      resolvePatch = r;
    });
    vi.mocked(api.patchCertificatePolicy).mockReturnValue(patchPending);

    const { rerender } = render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner-a"
        onClose={() => undefined}
      />,
    );
    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "88");
    await userEvent.click(screen.getByTestId("cp-save"));

    rerender(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner-b"
        onClose={() => undefined}
      />,
    );
    await screen.findByTestId("cp-days");
    resolvePatch!({
      ok: true,
      workspace: workspaceFixture(),
    });
    await waitFor(() => expect(api.fetchCertificatePolicyWorkspace).toHaveBeenCalledWith("owner-b"));
    expect(screen.queryByTestId("cp-status")).toBeNull();
  });

  it("retries general save after OCC refresh without losing draft", async () => {
    const ws = workspaceFixture();
    const bumped = workspaceFixture();
    bumped.general.version = 99;
    vi.mocked(api.fetchCertificatePolicyWorkspace)
      .mockResolvedValueOnce({ ok: true, workspace: ws })
      .mockResolvedValueOnce({ ok: true, workspace: bumped });
    vi.mocked(api.patchCertificatePolicy)
      .mockResolvedValueOnce({
        ok: false,
        code: "VERSION_CONFLICT",
        message: "conflict",
        workspace: bumped,
      })
      .mockResolvedValueOnce({ ok: true, workspace: bumped });

    render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );
    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByTestId("cp-save"));
    await userEvent.click(await screen.findByTestId("cp-occ-refresh"));
    await waitFor(() => expect(api.fetchCertificatePolicyWorkspace).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("cp-status")).toHaveTextContent(/Версии обновлены/);
    expect((days as HTMLInputElement).value).toBe("45");
    await userEvent.click(screen.getByTestId("cp-save"));
    await waitFor(() =>
      expect(screen.getByTestId("cp-status")).toHaveTextContent(/Сохранено/),
    );
    expect(api.patchCertificatePolicy).toHaveBeenCalledTimes(2);
  });

  it("leaves OCC banner when refresh fails", async () => {
    const ws = workspaceFixture();
    const bumped = workspaceFixture();
    bumped.general.version = 99;
    vi.mocked(api.fetchCertificatePolicyWorkspace)
      .mockResolvedValueOnce({ ok: true, workspace: ws })
      .mockResolvedValueOnce({ ok: false, code: "ERROR", message: "offline" });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({
      ok: false,
      code: "VERSION_CONFLICT",
      message: "conflict",
      workspace: bumped,
    });

    render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );
  const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByTestId("cp-save"));
    await userEvent.click(await screen.findByTestId("cp-occ-refresh"));
    await waitFor(() => expect(api.fetchCertificatePolicyWorkspace).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("cp-occ-recover")).toBeInTheDocument();
    expect((days as HTMLInputElement).value).toBe("45");
  });

  it("clears OCC banner after close, discard, and reopen", async () => {
    const ws = workspaceFixture();
    const bumped = workspaceFixture();
    bumped.general.version = 99;
    vi.mocked(api.fetchCertificatePolicyWorkspace)
      .mockResolvedValueOnce({ ok: true, workspace: ws })
      .mockResolvedValueOnce({ ok: true, workspace: ws });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({
      ok: false,
      code: "VERSION_CONFLICT",
      message: "conflict",
      workspace: bumped,
    });

    const onClose = vi.fn();
    const { rerender } = render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={onClose}
      />,
    );
    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByTestId("cp-save"));
    expect(screen.getByTestId("cp-occ-recover")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("term-change-close"));
    await userEvent.click(screen.getByTestId("cp-discard-guard-dismiss"));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <CertificatePolicyDialog open={false} canEditSettings viewerUserId="owner" onClose={onClose} />,
    );
    rerender(
      <CertificatePolicyDialog open canEditSettings viewerUserId="owner" onClose={onClose} />,
    );
    await screen.findByTestId("cp-tab-settings");
    expect(screen.queryByTestId("cp-occ-recover")).toBeNull();
  });

  it("clears OCC banner when switching partner after 409 discard", async () => {
    const ws = workspaceFixture();
    const bumped = workspaceFixture();
    bumped.general.version = 99;
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: true, workspace: ws });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({
      ok: false,
      code: "VERSION_CONFLICT",
      message: "conflict",
      workspace: bumped,
    });

    render(
      <CertificatePolicyDialog open canEditSettings viewerUserId="owner" onClose={() => undefined} />,
    );
    await userEvent.click(await screen.findByText("Для партнёра"));
    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "45");
    await userEvent.click(screen.getByTestId("cp-save"));
    expect(screen.getByTestId("cp-occ-recover")).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: /Store B/i }));
    await userEvent.click(screen.getByTestId("cp-discard-guard-dismiss"));
    expect(screen.queryByTestId("cp-occ-recover")).toBeNull();
    await screen.findByRole("button", { name: /Store B/i });
  });

  it("sends counterparty pool revision on propose_individual", async () => {
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({
      ok: true,
      workspace: workspaceFixture(),
    });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({
      ok: true,
      workspace: workspaceFixture(),
    });

    render(
      <CertificatePolicyDialog
        open
        canEditSettings
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );
    await userEvent.click(await screen.findByText("Для партнёра"));
    await userEvent.click(await screen.findByRole("button", { name: /Store B/i }));
    const days = await screen.findByTestId("cp-days");
    await userEvent.clear(days);
    await userEvent.type(days, "50");
    await userEvent.click(screen.getByRole("button", { name: /Предложить партнёру/i }));

    expect(api.patchCertificatePolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "propose_individual",
        counterpartyCategoryRatesRevision: "cp2:12.0",
        categoryRatesRevision: "doors:15.0",
        counterpartyUserId: "p2",
      }),
    );
  });

  it("sends proposal version for approve", async () => {
    const ws = workspaceFixture();
    ws.incomingProposals = [
      {
        id: "prop1",
        version: 7,
        proposerUserId: "p1",
        receiverUserId: "owner",
        createdAt: new Date().toISOString(),
        proposed: ws.general.effective,
        effective: ws.general.effective,
      },
    ];
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: true, workspace: ws });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({ ok: true, workspace: ws });

    render(
      <CertificatePolicyDialog
        open
        initialTab="incoming"
        canEditSettings={false}
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );

    await userEvent.click(await screen.findByTestId("cp-approve-prop1"));
    expect(api.patchCertificatePolicy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "approve_proposal",
        proposalId: "prop1",
        expectedProposalVersion: 7,
      }),
    );
  });

  it("labels two incoming proposals with distinct partner names and approve ids", async () => {
    const ws = workspaceFixture();
    ws.incomingProposals = [
      {
        id: "prop-a",
        version: 1,
        proposerUserId: "p1",
        receiverUserId: "owner",
        createdAt: new Date().toISOString(),
        proposed: { ...ws.general.effective, validityDays: 40 },
        effective: ws.general.effective,
      },
      {
        id: "prop-b",
        version: 2,
        proposerUserId: "p2",
        receiverUserId: "owner",
        createdAt: new Date().toISOString(),
        proposed: { ...ws.general.effective, validityDays: 55 },
        effective: ws.counterparties[1]!.effective,
      },
    ];
    vi.mocked(api.fetchCertificatePolicyWorkspace).mockResolvedValue({ ok: true, workspace: ws });
    vi.mocked(api.patchCertificatePolicy).mockResolvedValue({ ok: true, workspace: ws });

    render(
      <CertificatePolicyDialog
        open
        initialTab="incoming"
        canEditSettings={false}
        viewerUserId="owner"
        onClose={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("cp-incoming-prop-a")).toBeInTheDocument();
      expect(screen.getByTestId("cp-incoming-prop-b")).toBeInTheDocument();
    });
    expect(screen.getByText(/Store A предлагает новые условия/)).toBeInTheDocument();
    expect(screen.getByText(/Store B предлагает новые условия/)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("cp-approve-prop-b"));
    expect(api.patchCertificatePolicy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: "approve_proposal",
        proposalId: "prop-b",
        expectedProposalVersion: 2,
      }),
    );
  });
});