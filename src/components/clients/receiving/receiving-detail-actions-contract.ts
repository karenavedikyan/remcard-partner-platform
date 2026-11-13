/**
 * P4 → P6 mount contract (no fetch). P6 `ReceivingAppealDetailHost` wires these handlers.
 *
 * Order pipeline (only approved paid handoff — not completed payment):
 * - `onOpenOrderPipeline` → `RECEIVING_APPEAL_ORDER_PIPELINE_HREF` (`/scanner`, bare nav)
 * - `openPurchaseOrder` → `receivingAppealPurchaseDetailHref(orderId)`
 * Appeal/certificate/return context on scanner: **BLOCKED_CONTRACT** (see audit
 * `prototype-next-step-inline-pay-gap.md`). Never PATCH `sys_paid` from detail.
 *
 * Root UI pins (prep): P4 `9d22694f`, P6 `2375944e`, prototype `3dc31836`.
 */

import type {
  ReceivingAppealDetailActions,
  ReceivingAppealDetailReady,
} from "./ReceivingAppealDetailView";
import type { ReceivingAppealDetailMapped } from "./detail-contract-alignment";
import {
  RECEIVING_DETAIL_MARK_PAID_UNAVAILABLE,
  RECEIVING_DETAIL_PURCHASE_UNAVAILABLE,
  RECEIVING_DETAIL_SHIPPED_UNAVAILABLE,
} from "./receiving-detail-user-copy";

export const RECEIVING_DETAIL_INTEGRATION_PINS = {
  p4Detail: "9d22694f",
  p6Host: "2375944e",
  p6Workspace: "2375944e",
  k1: "a71b8f37",
  k8: "8f4d336a",
  p1: "f43f9e22",
  prototype: "3dc31836",
} as const;

export type ReceivingAppealProfilePatchInput = {
  privateNotes: string;
  expectedRevision: number;
};

export type ReceivingAppealStagePatchInput = {
  stageKey: string;
  refusedReason?: string | null;
  expectedRevision: number;
};

export type ReceivingAppealDetailMutationOutcome =
  | { ok: true; revision?: number }
  | { ok: false; conflict: boolean; message: string };

/** K1 `canTransitionAppealStage` — direct PATCH to paid is always rejected. */
export const K1_STAGE_REQUIRES_ORDER_PIPELINE = "STAGE_REQUIRES_ORDER_PIPELINE" as const;

export const STAGE_KEYS_BLOCKED_FOR_DIRECT_PATCH = new Set<string>(["sys_paid"]);

/** P6 navigates; P4 does not fetch. Matches `purchaseDetailHref` / wallet history. */
export function receivingAppealPurchaseDetailHref(purchaseOrderId: string): string {
  return `/history/purchases/${encodeURIComponent(purchaseOrderId)}`;
}

/** Existing scanner hub (store order / sale prep) — prod route `/scanner`. */
export const RECEIVING_APPEAL_ORDER_PIPELINE_HREF = "/scanner" as const;

/** Safe read-only panel: `src/components/history/PurchaseReceivingClientPanel.tsx` on purchase detail. */
export const RECEIVING_PURCHASE_PANEL_CALLBACK = "onOpenPurchaseOrder" as const;

/** When appeal has no `purchaseOrderId` yet — scanner/order pipeline entry. */
export const RECEIVING_ORDER_PIPELINE_CALLBACK = "onOpenOrderPipeline" as const;

/** User-facing when `onOpenOrderPipeline` / `onOpenPurchaseOrder` missing (rendered in detail). */
export const RECEIVING_MARK_PAID_ABSENT_REASON = RECEIVING_DETAIL_MARK_PAID_UNAVAILABLE;

export const RECEIVING_PAID_REVIEW_ABSENT_REASON = RECEIVING_DETAIL_PURCHASE_UNAVAILABLE;

/** Audit / P6 handoff only — not shown in product UI. */
export const RECEIVING_MARK_PAID_ABSENT_TECH =
  `K1 ${K1_STAGE_REQUIRES_ORDER_PIPELINE}: wire ${RECEIVING_ORDER_PIPELINE_CALLBACK} → ${RECEIVING_APPEAL_ORDER_PIPELINE_HREF} ` +
  `or ${RECEIVING_PURCHASE_PANEL_CALLBACK} → receivingAppealPurchaseDetailHref(orderId).`;

export function filterStageOptionsForDirectPatch<T extends { id: string }>(options: T[]): T[] {
  return options.filter((o) => !STAGE_KEYS_BLOCKED_FOR_DIRECT_PATCH.has(o.id));
}

export type ReceivingAppealDetailHostDeps = {
  appealId: string;
  mapped: ReceivingAppealDetailMapped;
  readOnly: boolean;
  mutateProfile: (
    body: ReceivingAppealProfilePatchInput,
  ) => Promise<ReceivingAppealDetailMutationOutcome>;
  mutateStage: (body: ReceivingAppealStagePatchInput) => Promise<ReceivingAppealDetailMutationOutcome>;
  reloadDetail: () => Promise<void>;
  openPurchaseOrder?: () => void;
  /** Certificate/manual without order yet — navigate to `/scanner` (no appeal stage PATCH). */
  onOpenOrderPipeline?: () => void;
  busy?: { notes?: boolean; stage?: boolean };
  error?: { notes?: string; stage?: string };
};

/** Pure builder for P6 host state — pass fresh `busy`/`error` each render from React state. */
export function buildReceivingAppealDetailReady(
  deps: ReceivingAppealDetailHostDeps,
): ReceivingAppealDetailReady {
  const { mapped, readOnly, busy, error } = deps;
  const revision =
    typeof mapped.revision === "number" ? mapped.revision : Number(mapped.revision) || 0;

  const actions: ReceivingAppealDetailActions | undefined = readOnly
    ? undefined
    : {
        expectedRevision: revision,
        workingStages: mapped.workingStages,
        refusalReasons: mapped.refusalReasons,
        busy,
        error,
        onSavePrivateNotes: async (privateNotes) => {
          const result = await deps.mutateProfile({ privateNotes, expectedRevision: revision });
          if (!result.ok && result.conflict) await deps.reloadDetail();
        },
        onApplyStage: async (payload) => {
          const result = await deps.mutateStage({
            stageKey: payload.stageKey,
            refusedReason: payload.refusedReason,
            expectedRevision: revision,
          });
          if (!result.ok && result.conflict) await deps.reloadDetail();
        },
        onOpenPurchaseOrder: deps.openPurchaseOrder,
        markPaid:
          deps.onOpenOrderPipeline || deps.openPurchaseOrder
            ? {
                supported: true,
                onMarkPaid: deps.onOpenOrderPipeline ?? deps.openPurchaseOrder!,
              }
            : { supported: false, reason: RECEIVING_MARK_PAID_ABSENT_REASON },
        paidReview:
          deps.openPurchaseOrder || deps.onOpenOrderPipeline
            ? {
                supported: true,
                onOpen: deps.openPurchaseOrder ?? deps.onOpenOrderPipeline!,
              }
            : { supported: false, reason: RECEIVING_PAID_REVIEW_ABSENT_REASON },
        shippedConfirm:
          mapped.appeal.stageId === "sys_paid" &&
          Boolean(mapped.appeal.purchaseOrderId || mapped.appeal.paidAtDisplay)
            ? {
                supported: true,
                onMarkShipped: () =>
                  void deps.mutateStage({
                    stageKey: "sys_shipped",
                    expectedRevision: revision,
                  }),
              }
            : {
                supported: false,
                reason: RECEIVING_DETAIL_SHIPPED_UNAVAILABLE,
              },
      };

  return {
    status: "ready",
    appeal: mapped.appeal,
    history: mapped.history,
    readOnly,
    actions,
  };
}
