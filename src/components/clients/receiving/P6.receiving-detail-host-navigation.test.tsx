import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  buildReceivingAppealOrderPipelineHref,
  receivingAppealPurchaseDetailHref,
} from "./receiving-detail-actions-contract";
import { ReceivingAppealDetailHost, P4_RECEIVING_DETAIL_UI_SHA } from "./ReceivingAppealDetailHost";
import * as api from "@/lib/clients-parity/receiving-appeals-api";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), refresh: vi.fn() }),
}));

function detailFetch(purchaseOrderId: string | null) {
  return {
    ok: true as const,
    wire: {
      appeal: {
        id: "ap_nav",
        clientDisplayName: "Клиент",
        stageKey: "ws_new",
        stageId: "ws_new",
        privateNotes: null,
        purchaseOrderId,
        certificateId: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      revision: 1,
      history: [],
      workingStages: [{ id: "ws_new", label: "Новый" }],
      refusalReasons: [],
    },
  };
}

describe("P6.receiving-detail-host navigation", () => {
  const fetchDetail = vi.spyOn(api, "fetchReceivingAppealDetailWire");

  beforeEach(() => {
    push.mockClear();
    fetchDetail.mockReset();
    vi.spyOn(api, "patchReceivingAppealProfileCas").mockResolvedValue({ ok: true });
    vi.spyOn(api, "patchReceivingAppealStageCas").mockResolvedValue({ ok: true });
  });

  it("documents P4 contract dependency SHA and purchase href", () => {
    expect(P4_RECEIVING_DETAIL_UI_SHA).toBe("9d22694f");
    expect(receivingAppealPurchaseDetailHref("ord-42")).toBe("/history/purchases/ord-42");
  });

  it("mocked journey: mark paid button opens scanner", async () => {
    fetchDetail.mockResolvedValue(detailFetch(null));
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(<ReceivingAppealDetailHost appealId="ap_nav" onBack={onBack} readOnly={false} />);

    await waitFor(() => expect(screen.queryByTestId("ca-receiving-detail-loading")).toBeNull());

    const markPaid = screen.getByTestId("ca-receiving-paid-review");
    expect(markPaid).toHaveTextContent(/Отметить оплату/i);
    await user.click(markPaid);
    expect(push).toHaveBeenCalledWith(buildReceivingAppealOrderPipelineHref("ap_nav"));

    await user.click(screen.getByRole("button", { name: /к списку/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("purchase button opens mapped order detail only", async () => {
    fetchDetail.mockResolvedValue(detailFetch("ord-42"));
    const user = userEvent.setup();

    render(<ReceivingAppealDetailHost appealId="ap_nav" onBack={() => undefined} readOnly={false} />);

    await waitFor(() => expect(screen.queryByTestId("ca-receiving-detail-loading")).toBeNull());

    const purchaseBtn = screen.getByTestId("ca-receiving-purchase-open");
    expect(purchaseBtn).toHaveTextContent("Подробнее о покупке");
    await user.click(purchaseBtn);
    expect(push).toHaveBeenCalledWith("/history/purchases/ord-42");
    expect(push).not.toHaveBeenCalledWith(buildReceivingAppealOrderPipelineHref("ap_nav"));
  });
});
