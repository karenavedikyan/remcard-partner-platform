import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as api from "@/lib/clients-parity/receiving-appeals-api";
import { useReceivingAppealScannerHandoff } from "./useReceivingAppealScannerHandoff";
import { saveScannerOrdinaryAppealBinding } from "@/lib/scanner/receiving-appeal-handoff";
import * as proxy from "@/lib/remcard-proxy";

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: vi.fn(() => true),
}));

const readyWire = (id: string, revision = 2) => ({
  ok: true as const,
  wire: {
    appeal: {
      id,
      clientDisplayName: "Client",
      purchaseOrderId: null,
      stageKey: "ws_new",
      certificateId: "cert-1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    revision,
    history: [],
    readOnly: false,
    access: { listAllowed: true, mutationsAllowed: true },
  },
});

const writableGate = { ok: true as const, gate: { readOnly: false, access: { mutationsAllowed: true } } };

describe("P6 scanner reload frozen scope (Hub handoff remount)", () => {
  beforeEach(() => {
    vi.spyOn(proxy, "isAllowedProxyRoute").mockReturnValue(true);
    sessionStorage.clear();
    vi.spyOn(api, "resolveReceivingScannerCertificateEntryGate").mockResolvedValue(writableGate);
    vi.spyOn(api, "fetchReceivingAppealDetailWire").mockResolvedValue(readyWire("ap_persist", 2));
  });

  it("after remount, restore + retry replays order-link with frozen revision", async () => {
  const linkSpy = vi.spyOn(api, "postReceivingAppealOrderLink").mockResolvedValue({
      ok: true,
      data: { appealId: "ap_persist", orderId: "ord-1", revision: 3, alreadyLinked: false },
    });

    saveScannerOrdinaryAppealBinding({
      v: 1,
      userId: "u1",
      idempotencyKey: "idem-reload",
      appealId: "ap_persist",
      certCode: "RC-RELOAD",
      branchId: "b1",
      revision: 2,
    });

    const attemptRecord = {
      version: 1 as const,
      userId: "u1",
      idempotencyKey: "idem-reload",
      body: { certificateCode: "RC-RELOAD", items: [{ category: "doors", amount: 500 }] },
      status: "unknown" as const,
      branchId: "b1",
    };

    const first = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    await act(async () => {
      await first.result.current.restoreOrdinaryAppealForStoredAttempt({
        userId: "u1",
        record: attemptRecord,
        isStale: () => false,
      });
    });
    first.unmount();

    const second = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    await act(async () => {
      await second.result.current.restoreOrdinaryAppealForStoredAttempt({
        userId: "u1",
        record: attemptRecord,
        isStale: () => false,
      });
    });
    await waitFor(() => expect(second.result.current.context.status).toBe("ready"));

    act(() => {
      second.result.current.prepareOrderAttemptScope("idem-reload", true, {
        userId: "u1",
        certCode: "RC-RELOAD",
        branchId: "b1",
      });
      second.result.current.beginOrderLinkAfterSuccess("ord-1", "idem-reload");
    });

    await waitFor(() => expect(linkSpy).toHaveBeenCalledTimes(1));
    expect(linkSpy.mock.calls[0]?.[1]).toEqual({ orderId: "ord-1", expectedRevision: 2 });
    linkSpy.mockRestore();
  });
});