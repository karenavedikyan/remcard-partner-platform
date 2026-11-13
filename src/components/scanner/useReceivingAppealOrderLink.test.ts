import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useReceivingAppealOrderLink } from "./useReceivingAppealOrderLink";

vi.mock("@/lib/clients-parity/receiving-appeal-scanner-context", () => ({
  loadReceivingAppealScannerContext: vi.fn(),
  previewCertificateMatchesAppeal: (appeal: string | null, preview: string | null | undefined) =>
    !appeal?.trim() || appeal === preview,
}));

vi.mock("@/lib/clients-parity/receiving-order-link-client", () => ({
  postReceivingAppealOrderLink: vi.fn(),
}));

import { loadReceivingAppealScannerContext } from "@/lib/clients-parity/receiving-appeal-scanner-context";
import { postReceivingAppealOrderLink } from "@/lib/clients-parity/receiving-order-link-client";

describe("useReceivingAppealOrderLink", () => {
  beforeEach(() => {
    vi.mocked(loadReceivingAppealScannerContext).mockReset();
    vi.mocked(postReceivingAppealOrderLink).mockReset();
  });

  it("loads appeal revision then links after order success", async () => {
    vi.mocked(loadReceivingAppealScannerContext).mockResolvedValue({
      ok: true,
      wire: {
        appealId: "a1",
        revision: 1,
        certificateId: null,
        purchaseOrderId: null,
        readOnly: false,
      },
    });
    vi.mocked(postReceivingAppealOrderLink).mockResolvedValue({
      ok: true,
      data: { appealId: "a1", orderId: "o1", revision: 2, alreadyLinked: false },
    });

    const { result } = renderHook(() => useReceivingAppealOrderLink("a1"));

    await waitFor(() => expect(result.current.appealWire?.revision).toBe(1));

    await act(async () => {
      await result.current.linkAfterOrderSuccess("o1");
    });

    expect(postReceivingAppealOrderLink).toHaveBeenCalledWith("a1", {
      orderId: "o1",
      expectedRevision: 1,
    });
    expect(result.current.linked).toBe(true);
  });

  it("retry uses same orderId only", async () => {
    vi.mocked(loadReceivingAppealScannerContext).mockResolvedValue({
      ok: true,
      wire: {
        appealId: "a1",
        revision: 1,
        certificateId: null,
        purchaseOrderId: null,
        readOnly: false,
      },
    });
    vi.mocked(postReceivingAppealOrderLink)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        code: "REVISION_CONFLICT",
        message: "conflict",
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { appealId: "a1", orderId: "o1", revision: 2, alreadyLinked: false },
      });

    const { result } = renderHook(() => useReceivingAppealOrderLink("a1"));
    await waitFor(() => expect(result.current.appealWire).toBeTruthy());

    await act(async () => {
      await result.current.linkAfterOrderSuccess("o1");
    });
    expect(result.current.linkError).toBeTruthy();

    await act(async () => {
      await result.current.retryLinkOnly();
    });

    expect(postReceivingAppealOrderLink).toHaveBeenCalledTimes(2);
    expect(postReceivingAppealOrderLink).toHaveBeenLastCalledWith("a1", {
      orderId: "o1",
      expectedRevision: 1,
    });
  });
});
