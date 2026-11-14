import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as api from "@/lib/clients-parity/receiving-appeals-api";
import { useReceivingAppealScannerHandoff } from "./useReceivingAppealScannerHandoff";
import { saveScannerOrdinaryAppealBinding } from "@/lib/scanner/receiving-appeal-handoff";
import * as proxy from "@/lib/remcard-proxy";

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: vi.fn(() => true),
}));

const readyWire = (id: string) => ({
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
    revision: 2,
    history: [],
    readOnly: false,
    access: { listAllowed: true, mutationsAllowed: true },
  },
});

const writableGate = { ok: true as const, gate: { readOnly: false, access: { mutationsAllowed: true } } };
const readOnlyGate = {
  ok: false as const,
  code: "READ_ONLY" as const,
  message: "read only",
  retryable: false,
};
const unknownGate = {
  ok: false as const,
  code: "ERROR" as const,
  message: "network",
  retryable: true,
};

describe("P6 scanner ordinary certificate-entry", () => {
  beforeEach(() => {
    vi.spyOn(proxy, "isAllowedProxyRoute").mockReturnValue(true);
    sessionStorage.clear();
  });

  it("writable gate: adopts via certificate-entry with branch and real CRM gate", async () => {
    vi.spyOn(api, "resolveReceivingScannerCertificateEntryGate").mockResolvedValue(writableGate);
    const entrySpy = vi.spyOn(api, "submitReceivingCertificateEntry").mockResolvedValue({
      ok: true,
      appealId: "ap_cert",
      outcome: "created",
      appeal: {
        id: "ap_cert",
        clientName: "Client",
        certificateId: "cert-1",
        receivingPartnerUserId: "u",
        receivingPartnerId: "u",
        referrerPartnerId: "r",
        interest: "",
        stageId: "ws_new",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    });
    vi.spyOn(api, "fetchReceivingAppealDetailWire").mockResolvedValue(readyWire("ap_cert"));

    const { result } = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    const ready = await result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-TEST",
      branchId: "branch-1",
      previewRequestId: 1,
      isStale: () => false,
    });
    expect(ready.ok).toBe(true);
    expect(entrySpy).toHaveBeenCalledWith(
      { promoCode: "RC-TEST" },
      writableGate.gate,
      { branchId: "branch-1" },
    );
    await waitFor(() => expect(result.current.blocksOrdinaryCheckout).toBe(false));
    entrySpy.mockRestore();
  });

  it("read-only gate: no certificate-entry and checkout not blocked", async () => {
    vi.spyOn(api, "resolveReceivingScannerCertificateEntryGate").mockResolvedValue(readOnlyGate);
    const entrySpy = vi.spyOn(api, "submitReceivingCertificateEntry");
    const { result } = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    const ready = await result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-TEST",
      previewRequestId: 1,
      isStale: () => false,
    });
    expect(ready.ok).toBe(true);
    expect(entrySpy).not.toHaveBeenCalled();
    expect(result.current.blocksOrdinaryCheckout).toBe(false);
    await waitFor(() => expect(result.current.crmReadOnlyNotice.length).toBeGreaterThan(0));
    entrySpy.mockRestore();
  });

  it("unknown gate: retryable error blocks checkout", async () => {
    vi.spyOn(api, "resolveReceivingScannerCertificateEntryGate").mockResolvedValue(unknownGate);
    const entrySpy = vi.spyOn(api, "submitReceivingCertificateEntry");
    const { result } = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    const ready = await result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-TEST",
      previewRequestId: 1,
      isStale: () => false,
    });
    expect(ready.ok).toBe(false);
    expect(entrySpy).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.crmGateRetryError).toBe("network"));
    expect(result.current.blocksOrdinaryCheckout).toBe(true);
    entrySpy.mockRestore();
  });

  it("restore uncertain attempt reloads persisted binding with zero entry calls", async () => {
    vi.spyOn(api, "resolveReceivingScannerCertificateEntryGate").mockResolvedValue(writableGate);
    const entrySpy = vi.spyOn(api, "submitReceivingCertificateEntry");
    vi.spyOn(api, "fetchReceivingAppealDetailWire").mockResolvedValue(readyWire("ap_persist"));
    saveScannerOrdinaryAppealBinding({
      v: 1,
      userId: "u1",
      idempotencyKey: "idem-1",
      appealId: "ap_persist",
      certCode: "RC-OLD",
      branchId: "b1",
      revision: 2,
    });
    const { result } = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    const restored = await result.current.restoreOrdinaryAppealForStoredAttempt({
      userId: "u1",
      record: {
        idempotencyKey: "idem-1",
        userId: "u1",
        body: { certificateCode: "RC-OLD", items: [] },
        branchId: "b1",
        status: "unknown",
      },
      isStale: () => false,
    });
    expect(restored.ok).toBe(true);
    expect(entrySpy).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.blocksOrdinaryCheckout).toBe(false));
    expect(result.current.appealId).toBe("ap_persist");
    entrySpy.mockRestore();
  });

  it("stale generation does not clear newer pending flag", async () => {
    vi.spyOn(api, "resolveReceivingScannerCertificateEntryGate").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(writableGate), 30);
        }),
    );
  vi.spyOn(api, "submitReceivingCertificateEntry").mockResolvedValue({
      ok: false,
      code: "ERROR",
      message: "late",
    });
    const { result } = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    let stale = false;
    const first = result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-1",
      previewRequestId: 1,
      isStale: () => stale,
    });
    stale = true;
    void result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-2",
      previewRequestId: 2,
      isStale: () => false,
    });
    await first;
    await waitFor(() => expect(result.current.certEntryPending).toBe(true));
  });
});