import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as api from "@/lib/clients-parity/receiving-appeals-api";
import { useReceivingAppealScannerHandoff } from "./useReceivingAppealScannerHandoff";
import {
  loadReceivingAppealScannerContext,
  parseReceivingAppealRevision,
  parseScannerAppealQueryValues,
} from "@/lib/scanner/receiving-appeal-handoff";
import * as proxy from "@/lib/remcard-proxy";

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: vi.fn(() => true),
}));

const readyWire = (id: string, revision: string | number | null = 1) => ({
  ok: true as const,
  wire: {
    appeal: {
      id,
      clientDisplayName: id,
      purchaseOrderId: null,
      stageKey: "ws_new",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    revision,
    history: [],
    readOnly: false,
    access: { listAllowed: true, mutationsAllowed: true },
  },
});

describe("P6 receiving scanner regressions", () => {
  beforeEach(() => {
    vi.spyOn(proxy, "isAllowedProxyRoute").mockReturnValue(true);
  });

  it("revision preflight rejects null, empty, and fractional wire values", async () => {
    expect(parseReceivingAppealRevision(null)).toBeNull();
    expect(parseReceivingAppealRevision("")).toBeNull();
    expect(parseReceivingAppealRevision(0.5)).toBeNull();
    expect(parseReceivingAppealRevision("0.5")).toBeNull();
    expect(parseReceivingAppealRevision(0)).toBe(0);
    expect(parseReceivingAppealRevision("3")).toBe(3);

    const fetchSpy = vi.spyOn(api, "fetchReceivingAppealDetailWire").mockResolvedValue(readyWire("ap1", null));
    const ctx = await loadReceivingAppealScannerContext("ap1");
    expect(ctx.status).toBe("error");
    fetchSpy.mockRestore();
  });

  it("duplicate appealId query is invalid (no silent first-wins)", () => {
    expect(parseScannerAppealQueryValues(["A", "B"]).mode).toBe("invalid");
    expect(parseScannerAppealQueryValues(["ap_ok"]).mode).toBe("scoped");
  });

  it("ignores stale detail load after appealId changes", async () => {
    let resolveOld: (v: Awaited<ReturnType<typeof api.fetchReceivingAppealDetailWire>>) => void =
      () => undefined;
    const oldPromise = new Promise<Awaited<ReturnType<typeof api.fetchReceivingAppealDetailWire>>>(
      (resolve) => {
        resolveOld = resolve;
      },
    );
    const fetchSpy = vi.spyOn(api, "fetchReceivingAppealDetailWire").mockImplementation((id) => {
      if (id === "ap_old") {
        return oldPromise;
      }
      return Promise.resolve(readyWire("ap_new", 1));
    });

    const { result, rerender } = renderHook(
      ({ id }) => useReceivingAppealScannerHandoff(id),
      { initialProps: { id: "ap_old" } },
    );
    rerender({ id: "ap_new" });
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    expect(result.current.appealId).toBe("ap_new");
    resolveOld(readyWire("ap_old", 1));
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    expect(
      result.current.context.status === "ready" ? result.current.context.clientLabel : null,
    ).toBe("ap_new");
    fetchSpy.mockRestore();
  });

  it("retry keeps frozen scope; URL change blocks link; same-scope link retry calls order-link twice", async () => {
    const linkSpy = vi
      .spyOn(api, "postReceivingAppealOrderLink")
      .mockResolvedValueOnce({ ok: false, code: "ERROR", message: "500" })
      .mockResolvedValueOnce({
        ok: true,
        data: { appealId: "ap_old", orderId: "ord-1", revision: 2, alreadyLinked: false },
      });

    const fetchSpy = vi
      .spyOn(api, "fetchReceivingAppealDetailWire")
      .mockResolvedValueOnce(readyWire("ap_old", 1))
      .mockResolvedValueOnce(readyWire("ap_new", 1))
      .mockResolvedValue(readyWire("ap_old", 1));

    const { result, rerender } = renderHook(
      ({ id }) => useReceivingAppealScannerHandoff(id),
      { initialProps: { id: "ap_old" } },
    );
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    result.current.prepareOrderAttemptScope("idem-1", false);

    rerender({ id: "ap_new" });
    await waitFor(() => expect(result.current.appealId).toBe("ap_new"));
    result.current.prepareOrderAttemptScope("idem-1", true);
    result.current.beginOrderLinkAfterSuccess("ord-wrong", "idem-1");
    await waitFor(() => expect(result.current.linkPhase).toBe("failed"));
    expect(linkSpy).not.toHaveBeenCalled();

    rerender({ id: "ap_old" });
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    result.current.prepareOrderAttemptScope("idem-1", true);
    result.current.beginOrderLinkAfterSuccess("ord-1", "idem-1");
    await waitFor(() => expect(result.current.linkPhase).toBe("failed"));
    await waitFor(() => expect(linkSpy).toHaveBeenCalledTimes(1));

    result.current.retryOrderLinkOnly();
    await waitFor(() => expect(linkSpy).toHaveBeenCalledTimes(2));
    expect(linkSpy.mock.calls[0]?.[0]).toBe("ap_old");
    expect(linkSpy.mock.calls[1]?.[0]).toBe("ap_old");

    linkSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it("restored retry without frozen scope fails closed for linking", async () => {
    const linkSpy = vi.spyOn(api, "postReceivingAppealOrderLink");
    vi.spyOn(api, "fetchReceivingAppealDetailWire").mockResolvedValue(readyWire("ap_old", 1));

    const { result } = renderHook(() => useReceivingAppealScannerHandoff("ap_old"));
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    result.current.prepareOrderAttemptScope("idem-missing", true);
    result.current.beginOrderLinkAfterSuccess("ord-1", "idem-missing");
    await waitFor(() => expect(result.current.linkPhase).toBe("failed"));
    expect(linkSpy).not.toHaveBeenCalled();
    linkSpy.mockRestore();
  });
});
