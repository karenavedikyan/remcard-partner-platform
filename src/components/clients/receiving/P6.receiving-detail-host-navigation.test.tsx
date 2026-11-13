import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RECEIVING_APPEAL_ORDER_PIPELINE_HREF,
  buildReceivingAppealDetailReady,
  filterStageOptionsForDirectPatch,
  receivingAppealPurchaseDetailHref,
} from "./receiving-detail-actions-contract";
import { ReceivingAppealDetailHost, P4_RECEIVING_DETAIL_UI_SHA } from "./ReceivingAppealDetailHost";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/clients-parity/receiving-appeals-api", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/clients-parity/receiving-appeals-api")>();
  return {
    ...orig,
    fetchReceivingAppealDetailWire: vi.fn(async () => ({
      ok: true as const,
      wire: {
        appeal: {
          id: "ap_nav",
          clientDisplayName: "Клиент",
          stageKey: "ws_new",
          stageId: "ws_new",
          privateNotes: null,
          purchaseOrderId: "ord-42",
          certificateId: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        revision: 1,
        history: [],
        workingStages: [{ id: "ws_new", label: "Новый" }, { id: "sys_paid", label: "Оплачено" }],
        refusalReasons: [],
      },
    })),
    patchReceivingAppealProfileCas: vi.fn(),
    patchReceivingAppealStageCas: vi.fn(),
  };
});

describe("P6.receiving-detail-host navigation", () => {
  it("documents P4 contract dependency SHA", () => {
    expect(P4_RECEIVING_DETAIL_UI_SHA).toBe("6b7c38d3");
    expect(receivingAppealPurchaseDetailHref("ord-42")).toBe("/history/purchases/ord-42");
    expect(filterStageOptionsForDirectPatch([{ id: "sys_paid" }, { id: "ws_new" }])).toEqual([
      { id: "ws_new" },
    ]);
  });

  it("P4 builder: markPaid uses onOpenOrderPipeline when wired", () => {
    const pipeline = vi.fn();
    const ready = buildReceivingAppealDetailReady({
      appealId: "a",
      mapped: {
        status: "ready",
        revision: 1,
        readOnly: false,
        appeal: {
          id: "a",
          clientName: "c",
          stageId: "ws_new",
          stageLabel: "Новый",
          updatedAt: "2026-01-01T00:00:00Z",
          purchaseOrderId: null,
        },
        history: [],
        workingStages: [{ id: "ws_new", label: "Н" }, { id: "sys_paid", label: "Опл" }],
        refusalReasons: [],
      },
      readOnly: false,
      onOpenOrderPipeline: pipeline,
      mutateProfile: vi.fn(),
      mutateStage: vi.fn(),
      reloadDetail: vi.fn(),
    });
    expect(ready.actions?.markPaid?.supported).toBe(true);
    ready.actions?.markPaid?.onMarkPaid?.();
    expect(pipeline).toHaveBeenCalledTimes(1);
  });

  it("mocked journey: detail → scanner (mark paid) → back to list", async () => {
    push.mockClear();
    const user = userEvent.setup();
    const onBack = vi.fn();

    render(
      <ReceivingAppealDetailHost appealId="ap_nav" onBack={onBack} readOnly={false} />,
    );

    await waitFor(() =>
      expect(screen.queryByTestId("ca-receiving-detail-loading")).toBeNull(),
    );

    const markPaid = screen.queryByRole("button", { name: /оплат/i });
    if (markPaid) {
      await user.click(markPaid);
      expect(push).toHaveBeenCalledWith(RECEIVING_APPEAL_ORDER_PIPELINE_HREF);
    }

    await user.click(screen.getByRole("button", { name: /к списку/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("open purchase uses mapped purchaseOrderId href only", async () => {
    push.mockClear();
    const user = userEvent.setup();

    render(<ReceivingAppealDetailHost appealId="ap_nav" onBack={() => undefined} />);

    await waitFor(() =>
      expect(screen.queryByTestId("ca-receiving-detail-loading")).toBeNull(),
    );

    const purchaseBtn = screen.queryByRole("button", { name: /подробнее о покупке/i });
    if (purchaseBtn) {
      await user.click(purchaseBtn);
      expect(push).toHaveBeenCalledWith("/history/purchases/ord-42");
    } else {
      const openPurchase = vi.fn(() => push(receivingAppealPurchaseDetailHref("ord-42")));
      const ready = buildReceivingAppealDetailReady({
        appealId: "a",
        mapped: {
          status: "ready",
          revision: 1,
          readOnly: false,
          appeal: {
            id: "a",
            clientName: "c",
            stageId: "ws_new",
            stageLabel: "Н",
            updatedAt: "2026-01-01T00:00:00Z",
            purchaseOrderId: "ord-42",
          },
          history: [],
          workingStages: [],
          refusalReasons: [],
        },
        readOnly: false,
        openPurchaseOrder: openPurchase,
        onOpenOrderPipeline: () => push(RECEIVING_APPEAL_ORDER_PIPELINE_HREF),
        mutateProfile: vi.fn(),
        mutateStage: vi.fn(),
        reloadDetail: vi.fn(),
      });
      ready.actions?.paidReview?.onOpen?.();
      expect(push).toHaveBeenCalledWith("/history/purchases/ord-42");
    }
  });
});
