/**
 * P6 host orchestration — behavior aligned to P4 `receiving-detail-actions-contract.ts` @ `6b7c38d3`
 * (read-only dependency; do not edit P4 originals on this branch).
 */
import type { ReceivingAppealDetailActions, ReceivingAppealDetailReady } from "./ReceivingAppealDetailView";
import type { ReceivingAppealDetailMapped } from "./detail-contract-alignment";
import type {
  ReceivingAppealDetailMutationOutcome,
  ReceivingAppealProfilePatchInput,
  ReceivingAppealStagePatchInput,
} from "./receiving-detail-actions-contract";

export const P4_RECEIVING_DETAIL_CONTRACT_REF = "6b7c38d3" as const;

export const K1_STAGE_REQUIRES_ORDER_PIPELINE = "STAGE_REQUIRES_ORDER_PIPELINE" as const;

export const STAGE_KEYS_BLOCKED_FOR_DIRECT_PATCH = new Set<string>(["sys_paid"]);

/** P4 @ 6b7c38d — wallet purchase detail route only when `purchaseOrderId` is mapped. */
export function receivingAppealPurchaseDetailHref(purchaseOrderId: string): string {
  return `/history/purchases/${encodeURIComponent(purchaseOrderId)}`;
}

/** Existing scanner hub (ScannerHub) — prod route `/scanner`. */
export const RECEIVING_APPEAL_ORDER_PIPELINE_HREF = "/scanner" as const;

export function filterStageOptionsForDirectPatch<T extends { id: string }>(options: T[]): T[] {
  return options.filter((o) => !STAGE_KEYS_BLOCKED_FOR_DIRECT_PATCH.has(o.id));
}

export type ReceivingAppealDetailHostWiringDeps = {
  mapped: ReceivingAppealDetailMapped;
  readOnly: boolean;
  mutateProfile: (body: ReceivingAppealProfilePatchInput) => Promise<ReceivingAppealDetailMutationOutcome>;
  mutateStage: (body: ReceivingAppealStagePatchInput) => Promise<ReceivingAppealDetailMutationOutcome>;
  reloadDetail: () => Promise<void>;
  openPurchaseOrder?: () => void;
  onOpenOrderPipeline?: () => void;
  busy?: { notes?: boolean; stage?: boolean };
  error?: { notes?: string; stage?: string };
};

const RECEIVING_MARK_PAID_ABSENT_REASON =
  "Оплата не отмечается PATCH этапа «Оплачено» (K1: STAGE_REQUIRES_ORDER_PIPELINE). " +
  `Нужен order pipeline (→ ${RECEIVING_APPEAL_ORDER_PIPELINE_HREF}) или связанный заказ (/history/purchases/:orderId).`;

const RECEIVING_PAID_REVIEW_ABSENT_REASON =
  "Категории/сумма — в существующем заказе кошелька и order pipeline, не в profile PATCH. " +
  "Без заказа: scanner; с purchaseOrderId: деталь покупки (read-only; запись — approved order flow).";

/**
 * Builds ready props for P4 view — finance affordances are navigation only (no PATCH paid / no new APIs).
 */
export function buildReceivingAppealDetailReadyForHost(
  deps: ReceivingAppealDetailHostWiringDeps,
): ReceivingAppealDetailReady {
  const { mapped, readOnly, busy, error } = deps;
  const revision =
    typeof mapped.revision === "number" ? mapped.revision : Number(mapped.revision) || 0;

  const actions: ReceivingAppealDetailActions | undefined = readOnly
    ? undefined
    : {
        expectedRevision: revision,
        workingStages: filterStageOptionsForDirectPatch(mapped.workingStages),
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
                reason: "Сначала оплата в кошельке/заказе — прямой PATCH «Оплачено» недоступен (K1).",
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
