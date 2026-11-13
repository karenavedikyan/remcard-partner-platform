/**
 * P4 → P6 mount contract (no fetch). P6 `ReceivingAppealDetailHost` wires these handlers.
 *
 * Root handoff (appeal-scoped navigation — P6 `navigateTo` or explicit callbacks):
 * - `buildReceivingAppealOrderPipelineHref(appealId)` → `/scanner?appealId=…`
 * - `receivingAppealReturnHref(appealId)` → `/clients?direction=receiving&appealId=…`
 * - `receivingAppealPurchaseDetailHref(orderId, appealId?)` → purchase detail + optional context
 * Store order creation / `POST …/order-link` — K1/K8, not P4. Never PATCH `sys_paid` from detail.
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
import {
  buildReceivingAppealOrderPipelineHref,
  receivingAppealPurchaseDetailHref,
} from "./receiving-appeal-navigation";

export {
  RECEIVING_APPEAL_CONTEXT_QUERY_KEY,
  RECEIVING_CLIENTS_RECEIVING_DIRECTION,
  buildReceivingAppealOrderPipelineHref,
  receivingAppealReturnHref,
  receivingAppealPurchaseDetailHref,
} from "./receiving-appeal-navigation";

export const RECEIVING_DETAIL_INTEGRATION_PINS = {
  p4Detail: "08e71600",
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

/** Scanner base route (contextual entry uses `buildReceivingAppealOrderPipelineHref`). */
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
  `K1 ${K1_STAGE_REQUIRES_ORDER_PIPELINE}: wire ${RECEIVING_ORDER_PIPELINE_CALLBACK} → buildReceivingAppealOrderPipelineHref(appealId) ` +
  `or ${RECEIVING_PURCHASE_PANEL_CALLBACK} → receivingAppealPurchaseDetailHref(orderId, appealId).`;

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
  /** When set, P4 builds appeal-scoped purchase/scanner hrefs unless callbacks override. */
  navigateTo?: (href: string) => void;
  openPurchaseOrder?: () => void;
  /** Overrides default `buildReceivingAppealOrderPipelineHref(appealId)` navigation. */
  onOpenOrderPipeline?: () => void;
  busy?: { notes?: boolean; stage?: boolean };
  error?: { notes?: string; stage?: string };
};

function resolveOnOpenOrderPipeline(deps: ReceivingAppealDetailHostDeps): (() => void) | undefined {
  if (deps.onOpenOrderPipeline) return deps.onOpenOrderPipeline;
  if (!deps.navigateTo) return undefined;
  const href = buildReceivingAppealOrderPipelineHref(deps.appealId);
  return () => deps.navigateTo!(href);
}

function resolveOpenPurchaseOrder(deps: ReceivingAppealDetailHostDeps): (() => void) | undefined {
  if (deps.openPurchaseOrder) return deps.openPurchaseOrder;
  const orderId = deps.mapped.appeal.purchaseOrderId?.trim();
  if (!orderId || !deps.navigateTo) return undefined;
  const href = receivingAppealPurchaseDetailHref(orderId, deps.appealId);
  return () => deps.navigateTo!(href);
}

/** Pure builder for P6 host state — pass fresh `busy`/`error` each render from React state. */
export function buildReceivingAppealDetailReady(
  deps: ReceivingAppealDetailHostDeps,
): ReceivingAppealDetailReady {
  const { mapped, readOnly, busy, error } = deps;
  const revision =
    typeof mapped.revision === "number" ? mapped.revision : Number(mapped.revision) || 0;

  const onOpenOrderPipeline = resolveOnOpenOrderPipeline(deps);
  const openPurchaseOrder = resolveOpenPurchaseOrder(deps);

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
        onOpenPurchaseOrder: openPurchaseOrder,
        markPaid:
          onOpenOrderPipeline || openPurchaseOrder
            ? {
                supported: true,
                onMarkPaid: onOpenOrderPipeline ?? openPurchaseOrder!,
              }
            : { supported: false, reason: RECEIVING_MARK_PAID_ABSENT_REASON },
        paidReview:
          openPurchaseOrder || onOpenOrderPipeline
            ? {
                supported: true,
                onOpen: openPurchaseOrder ?? onOpenOrderPipeline!,
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
