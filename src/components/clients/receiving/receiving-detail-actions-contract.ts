/**
 * P4 → P6 mount contract (no fetch). P6 `ReceivingAppealDetailHost` wires these handlers.
 * Pins: P4 product tip, P6 host @ 86251070+, workspace @ 78fd46e7+.
 */

import type {
  ReceivingAppealDetailActions,
  ReceivingAppealDetailReady,
} from "./ReceivingAppealDetailView";
import type { ReceivingAppealDetailMapped } from "./detail-contract-alignment";

export const RECEIVING_DETAIL_INTEGRATION_PINS = {
  p4Detail: "10c25fe6",
  p6Host: "86251070",
  p6Workspace: "78fd46e7",
  k1: "a71b8f37",
  k8: "8f4d336a",
  p1: "2b2b32b8",
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

/** Prototype `panel:pay` / pay category form — not profile PATCH finance fields. */
export const RECEIVING_PAID_REVIEW_PARENT_CALLBACK = "onOpenPaidReview" as const;

export const RECEIVING_PAID_REVIEW_ABSENT_REASON =
  "Категории и сумма оплаты — через K1 PATCH …/stage (этап «Оплачено») и существующие order flows. " +
  `Отсутствует колбэк хоста «${RECEIVING_PAID_REVIEW_PARENT_CALLBACK}»; P6 не должен писать paidAmount в profile PATCH.`;

export const RECEIVING_MARK_PAID_ABSENT_REASON =
  "Отметить оплату — смена этапа на «Оплачено» (PATCH …/:id/stage), не правка суммы в карточке.";

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
  onOpenPaidReview?: () => void;
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
        markPaid: deps.onOpenPaidReview
          ? { supported: true, onMarkPaid: deps.onOpenPaidReview }
          : { supported: false, reason: RECEIVING_MARK_PAID_ABSENT_REASON },
        paidReview: deps.onOpenPaidReview
          ? { supported: true, onOpen: deps.onOpenPaidReview }
          : { supported: false, reason: RECEIVING_PAID_REVIEW_ABSENT_REASON },
        shippedConfirm:
          mapped.appeal.stageId === "sys_paid"
            ? {
                supported: true,
                onMarkShipped: () =>
                  void deps.mutateStage({
                    stageKey: "sys_shipped",
                    expectedRevision: revision,
                  }),
              }
            : { supported: false, reason: "Доступно на этапе «Оплачено»." },
      };

  return {
    status: "ready",
    appeal: mapped.appeal,
    history: mapped.history,
    readOnly,
    actions,
  };
}
