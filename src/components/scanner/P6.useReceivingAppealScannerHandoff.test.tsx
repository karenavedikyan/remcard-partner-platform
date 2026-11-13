import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as api from "@/lib/clients-parity/receiving-appeals-api";
import { useReceivingAppealScannerHandoff } from "./useReceivingAppealScannerHandoff";
import * as proxy from "@/lib/remcard-proxy";

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: vi.fn(() => true),
}));

describe("P6 useReceivingAppealScannerHandoff", () => {
  beforeEach(() => {
    vi.spyOn(proxy, "isAllowedProxyRoute").mockReturnValue(true);
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
      return Promise.resolve({
        ok: true,
        wire: {
          appeal: {
            id: "ap_new",
            clientDisplayName: "New",
            purchaseOrderId: null,
            stageKey: "ws_new",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
          },
          revision: 1,
          history: [],
          readOnly: false,
        },
      });
    });

    const { result, rerender } = renderHook(
      ({ id }) => useReceivingAppealScannerHandoff(id),
      { initialProps: { id: "ap_old" } },
    );
    rerender({ id: "ap_new" });
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    expect(result.current.appealId).toBe("ap_new");
    resolveOld({
      ok: true,
      wire: {
        appeal: {
          id: "ap_old",
          clientDisplayName: "Old",
          purchaseOrderId: null,
          stageKey: "ws_new",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        revision: 1,
        history: [],
        readOnly: false,
      },
    });
    await waitFor(() => expect(result.current.context.status).toBe("ready"));
    expect(
      result.current.context.status === "ready"
        ? result.current.context.clientLabel
        : null,
    ).toBe("New");
    fetchSpy.mockRestore();
  });
});
