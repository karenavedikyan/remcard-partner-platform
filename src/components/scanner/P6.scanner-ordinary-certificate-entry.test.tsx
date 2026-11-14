import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as api from "@/lib/clients-parity/receiving-appeals-api";
import { useReceivingAppealScannerHandoff } from "./useReceivingAppealScannerHandoff";
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

describe("P6 scanner ordinary certificate-entry", () => {
  beforeEach(() => {
    vi.spyOn(proxy, "isAllowedProxyRoute").mockReturnValue(true);
  });

  it("adopts trusted appeal from certificate-entry with branch capture", async () => {
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
      undefined,
      { branchId: "branch-1", scannerAuthorizeStoreScan: true },
    );
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    expect(result.current.appealId).toBe("ap_cert");
    expect(result.current.blocksOrdinaryCheckout).toBe(false);
    entrySpy.mockRestore();
  });

  it("repeated scan reuses ready context without second entry", async () => {
    const entrySpy = vi.spyOn(api, "submitReceivingCertificateEntry").mockResolvedValue({
      ok: true,
      appealId: "ap_cert",
      outcome: "existing",
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
    await result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-TEST",
      branchId: "b1",
      previewRequestId: 1,
      isStale: () => false,
    });
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    entrySpy.mockClear();
    const again = await result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-TEST",
      branchId: "b1",
      previewRequestId: 2,
      isStale: () => false,
    });
    expect(again.ok).toBe(true);
    expect(entrySpy).not.toHaveBeenCalled();
    entrySpy.mockRestore();
  });

  it("entry failure blocks checkout and keeps error visible", async () => {
    vi.spyOn(api, "submitReceivingCertificateEntry").mockResolvedValue({
      ok: false,
      code: "INVALID",
      message: "Сертификат недействителен",
    });
    const { result } = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    const res = await result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-BAD",
      previewRequestId: 1,
      isStale: () => false,
    });
    expect(res.ok).toBe(false);
    await waitFor(() =>
      expect(result.current.certEntryError).toContain("недействителен"),
    );
    expect(result.current.blocksOrdinaryCheckout).toBe(true);
    expect(result.current.appealId).toBeNull();
  });

  it("stale preview abandons adopted context load", async () => {
    let stale = false;
    vi.spyOn(api, "submitReceivingCertificateEntry").mockResolvedValue({
      ok: true,
      appealId: "ap_old",
      outcome: "created",
      appeal: {
        id: "ap_old",
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
    vi.spyOn(api, "fetchReceivingAppealDetailWire").mockImplementation(async () => {
      stale = true;
      return readyWire("ap_old");
    });
    const { result } = renderHook(() => useReceivingAppealScannerHandoff({ mode: "none" }));
    const res = await result.current.ensureOrdinaryAppealContext({
      promoCode: "RC-1",
      branchId: "b1",
      previewRequestId: 3,
      isStale: () => stale,
    });
    expect(res.ok).toBe(false);
  });
});