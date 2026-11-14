"use client";

import { useEffect, useMemo, useState } from "react";
import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import styles from "../observer/observer.module.css";
import {
  ReceivingAppealHistory,
  type ReceivingAppealHistoryEntry,
} from "./ReceivingAppealHistory";
import { filterStageOptionsForDirectPatch } from "./receiving-detail-actions-contract";
import {
  RECEIVING_DETAIL_CONFLICT_RELOAD_LABEL,
  RECEIVING_DETAIL_MANUAL_CERT_NOTE,
  RECEIVING_DETAIL_MARK_PAID_LABEL,
  RECEIVING_DETAIL_NOTES_PLACEHOLDER,
  RECEIVING_DETAIL_NOTES_SAVE_LABEL,
  RECEIVING_DETAIL_PURCHASE_HEADING,
  RECEIVING_DETAIL_PURCHASE_LINK_PENDING,
  RECEIVING_DETAIL_PURCHASE_MORE_LABEL,
  RECEIVING_DETAIL_PURCHASE_UNAVAILABLE,
  RECEIVING_DETAIL_STAGE_APPLY_LABEL,
  RECEIVING_DETAIL_STAGE_SHIPPED_LABEL,
} from "./receiving-detail-user-copy";

const SYSTEM_STAGE_OPTIONS = [
  { id: "sys_new", label: "Новое обращение" },
  { id: "sys_paid", label: "Оплачено" },
  { id: "sys_shipped", label: "Отгружено" },
  { id: "sys_return", label: "Возврат" },
  { id: "sys_refused", label: "Отказ" },
] as const;

/** K1 receiving appeal card — UI view-model after P4 mapper (not raw `ClientAppealRecord`). */
export type ReceivingAppealDetailDto = {
  id: string;
  clientName: string;
  clientContact?: string | null;
  interest?: string | null;
  clientCity?: string | null;
  budgetHint?: string | null;
  stageId: string;
  stageLabel: string;
  certificateId?: string | null;
  referrerPartnerName?: string | null;
  sourceLabel?: string | null;
  updatedAt: string;
  originKind?: "CERTIFICATE" | "MANUAL";
  discountPercent?: number | null;
  certValidUntil?: string | null;
  certValidUntilDisplay?: string | null;
  privateNotes?: string | null;
  purchaseOrderId?: string | null;
  receivingPartnerUserId?: string | null;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
  /** Client purchase projection from K8 `paidAmountKopecks` (not partner bonus payout). */
  paidDisplayLabel?: string | null;
  paidAtDisplay?: string | null;
};

/** P6 wires K1 PATCH handlers — P4 never calls API directly. */
export type ReceivingAppealDetailActions = {
  expectedRevision: number;
  workingStages: { id: string; label: string }[];
  refusalReasons?: string[];
  onSavePrivateNotes?: (privateNotes: string) => void | Promise<void>;
  onApplyStage?: (payload: { stageKey: string; refusedReason?: string | null }) => void | Promise<void>;
  onOpenPurchaseOrder?: () => void;
  markPaid?:
    | { supported: true; onMarkPaid: () => void }
    | { supported: false; reason: string };
  /** Prototype pay panel — P6 order pipeline (`/scanner` or purchase detail), never PATCH `sys_paid`. */
  paidReview?:
    | { supported: true; onOpen: () => void }
    | { supported: false; reason: string };
  /** Prototype «Отметить отгрузку» on `sys_paid` — K1 stage PATCH only. */
  shippedConfirm?:
    | { supported: true; onMarkShipped: () => void }
    | { supported: false; reason: string };
  /** P6 reload after K1 409 stale `expectedRevision`. */
  onConflict?: () => void;
  busy?: { notes?: boolean; stage?: boolean };
  error?: { notes?: string; stage?: string };
};

export type ReceivingAppealDetailReady = {
  status: "ready";
  appeal: ReceivingAppealDetailDto;
  history: ReceivingAppealHistoryEntry[];
  /** When true, CRM stage/notes actions stay disabled (observer must never write). */
  readOnly?: boolean;
  actions?: ReceivingAppealDetailActions;
};

export type ReceivingAppealDetailProps = {
  onBack: () => void;
} & (
  | ReceivingAppealDetailReady
  | { status: "missing"; appealId?: string }
  | { status: "error"; message: string; onRetry?: () => void }
);

function stageOptionsForPicker(
  currentStageId: string,
  workingStages: { id: string; label: string }[],
): { id: string; label: string }[] {
  const byId = new Map<string, string>();
  for (const s of SYSTEM_STAGE_OPTIONS) byId.set(s.id, s.label);
  for (const s of workingStages) {
    if (s.id.trim()) byId.set(s.id, s.label.trim() || s.id);
  }
  if (currentStageId && !byId.has(currentStageId)) {
    byId.set(currentStageId, currentStageId);
  }
  const options = [...byId.entries()]
    .filter(([id]) => id !== currentStageId)
    .map(([id, label]) => ({ id, label }));
  return filterStageOptionsForDirectPatch(options);
}

function receivingPurchaseUnsupportedMessage(
  actions: ReceivingAppealDetailActions | undefined,
): string {
  const paidReview = actions?.paidReview;
  if (paidReview !== undefined && paidReview.supported === false) {
    return paidReview.reason;
  }
  const markPaid = actions?.markPaid;
  if (markPaid !== undefined && markPaid.supported === false) {
    return markPaid.reason;
  }
  return RECEIVING_DETAIL_PURCHASE_UNAVAILABLE;
}

type ReceivingAppealStageControlsProps = {
  appealStageId: string;
  actions: ReceivingAppealDetailActions;
  stagePick: string;
  refusalPick: string;
  stageChoices: { id: string; label: string }[];
  onStagePick: (value: string) => void;
  onRefusalPick: (value: string) => void;
};

function ReceivingAppealStageControls({
  appealStageId,
  actions,
  stagePick,
  refusalPick,
  stageChoices,
  onStagePick,
  onRefusalPick,
}: ReceivingAppealStageControlsProps) {
  const shipped = actions.shippedConfirm;
  const refusalReasons = actions.refusalReasons ?? [];

  return (
    <section className={styles.blocked} data-testid="ca-receiving-detail-stage">
      <h3>Следующий шаг</h3>
      {appealStageId === "sys_paid" && shipped?.supported === true ? (
        <button
          type="button"
          className={styles.ghostBtn}
          data-ca-action="receiving:stage:shipped"
          data-testid="ca-receiving-mark-shipped"
          disabled={actions.busy?.stage}
          onClick={shipped.onMarkShipped}
        >
          {RECEIVING_DETAIL_STAGE_SHIPPED_LABEL}
        </button>
      ) : null}
      <label className={styles.field}>
        Перевести в этап
        <select
          value={stagePick}
          onChange={(e) => onStagePick(e.target.value)}
          disabled={!actions.onApplyStage || actions.busy?.stage}
          data-testid="ca-receiving-stage-select"
        >
          <option value="">— выберите —</option>
          {stageChoices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {stagePick === "sys_refused" && refusalReasons.length > 0 ? (
        <label className={styles.field}>
          Причина отказа
          <select
            value={refusalPick}
            onChange={(e) => onRefusalPick(e.target.value)}
            data-testid="ca-receiving-refusal-select"
          >
            <option value="">— выберите —</option>
            {refusalReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        className={styles.ghostBtn}
        disabled={!stagePick || !actions.onApplyStage || actions.busy?.stage}
        data-ca-action="receiving:stage:apply"
        data-testid="ca-receiving-stage-apply"
        onClick={() => {
          if (!actions.onApplyStage || !stagePick) return;
          actions.onApplyStage({
            stageKey: stagePick,
            refusedReason: stagePick === "sys_refused" ? refusalPick || null : null,
          });
        }}
      >
        {actions.busy?.stage ? "Сохраняем…" : RECEIVING_DETAIL_STAGE_APPLY_LABEL}
      </button>
      {actions.error?.stage ? (
        <p className={styles.mutedSmall} role="alert" data-testid="ca-receiving-stage-error">
          {actions.error.stage}
          {actions.onConflict ? (
            <>
              {" "}
              <button
                type="button"
                className={styles.ghostBtn}
                data-testid="ca-receiving-stage-retry"
                onClick={actions.onConflict}
              >
                {RECEIVING_DETAIL_CONFLICT_RELOAD_LABEL}
              </button>
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Prototype `renderDetailPage` body — notes, stage controls, purchase affordances.
 * Mutations only via `actions` callbacks (P6 → K1 profile PATCH + stage PATCH).
 */
export function ReceivingAppealDetailView(props: ReceivingAppealDetailProps) {
  const { onBack } = props;
  const ready = props.status === "ready" ? props : null;
  const writableActions =
    ready && !ready.readOnly && ready.actions ? ready.actions : undefined;

  const [notesDraft, setNotesDraft] = useState("");
  const [stagePick, setStagePick] = useState("");
  const [refusalPick, setRefusalPick] = useState("");

  useEffect(() => {
    if (props.status !== "ready") return;
    setNotesDraft(props.appeal.privateNotes ?? "");
    setStagePick("");
    setRefusalPick("");
  }, [props.status, props.status === "ready" ? props.appeal.id : "", props.status === "ready" ? props.appeal.privateNotes : ""]);

  const stageChoices = useMemo(() => {
    if (!writableActions) return [];
    return stageOptionsForPicker(ready!.appeal.stageId, writableActions.workingStages);
  }, [writableActions, ready?.appeal.stageId]);

  return (
    <div className={styles.section} data-testid="ca-receiving-appeal-detail">
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="receiving:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        ← К списку клиентов
      </button>

      {props.status === "missing" ? (
        <section className={styles.blocked} data-testid="ca-receiving-appeal-missing">
          <h2>Обращение не найдено</h2>
          <p className={styles.mutedSmall}>
            {props.appealId
              ? `Обращение «${props.appealId}» недоступно в текущем списке.`
              : "Обращение недоступно в текущем списке."}
          </p>
        </section>
      ) : null}

      {props.status === "error" ? (
        <section className={styles.blocked} data-testid="ca-receiving-appeal-error">
          <h2>Данные обращения недоступны</h2>
          <p className={styles.mutedSmall}>{props.message}</p>
          {props.onRetry ? (
            <button type="button" className={styles.ghostBtn} onClick={props.onRetry}>
              Повторить
            </button>
          ) : null}
        </section>
      ) : null}

      {props.status === "ready" ? (
        <>
          <header className={styles.partnerPageHead}>
            <h2 id="ca-receiving-appeal-title">{props.appeal.clientName}</h2>
            <p className={styles.mutedSmall}>
              Этап: <strong>{props.appeal.stageLabel}</strong>
              {props.readOnly ? " · только просмотр" : ""}
            </p>
          </header>

          {!props.readOnly && props.actions ? (
            <ReceivingAppealStageControls
              appealStageId={props.appeal.stageId}
              actions={props.actions}
              stagePick={stagePick}
              refusalPick={refusalPick}
              stageChoices={stageChoices}
              onStagePick={setStagePick}
              onRefusalPick={setRefusalPick}
            />
          ) : null}

          <dl className={styles.detailGrid} aria-labelledby="ca-receiving-appeal-title">
            <div>
              <dt>Обращение</dt>
              <dd>
                <code data-testid="ca-receiving-appeal-id">{props.appeal.id}</code>
              </dd>
            </div>
            <div>
              <dt>Контакт</dt>
              <dd>{props.appeal.clientContact?.trim() || "Контакт не указан"}</dd>
            </div>
            <div>
              <dt>Запрос</dt>
              <dd>{props.appeal.interest?.trim() || "—"}</dd>
            </div>
            {props.appeal.clientCity?.trim() ? (
              <div>
                <dt>Город</dt>
                <dd>{props.appeal.clientCity}</dd>
              </div>
            ) : null}
            {props.appeal.budgetHint?.trim() ? (
              <div>
                <dt>Бюджет</dt>
                <dd>{props.appeal.budgetHint}</dd>
              </div>
            ) : null}
            <div>
              <dt>Источник</dt>
              <dd>{props.appeal.sourceLabel?.trim() || "—"}</dd>
            </div>
            {props.appeal.originKind === "CERTIFICATE" ? (
              <>
                <div>
                  <dt>Сертификат</dt>
                  <dd>{props.appeal.certificateId?.trim() || "—"}</dd>
                </div>
                <div data-testid="ca-receiving-cert-meta">
                  <dt>Скидка / срок</dt>
                  <dd>
                    {props.appeal.discountPercent != null ? `${props.appeal.discountPercent}%` : "—"}
                    {props.appeal.certValidUntilDisplay
                      ? ` · до ${props.appeal.certValidUntilDisplay}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Направил</dt>
                  <dd>{props.appeal.referrerPartnerName?.trim() || "—"}</dd>
                </div>
              </>
            ) : (
              <div>
                <dt>Сертификат</dt>
                <dd className={styles.mutedSmall}>{RECEIVING_DETAIL_MANUAL_CERT_NOTE}</dd>
              </div>
            )}
            {props.appeal.paidDisplayLabel ? (
              <div data-testid="ca-receiving-purchase-paid">
                <dt>Сумма покупки до скидки</dt>
                <dd>
                  {props.appeal.paidDisplayLabel}
                  {props.appeal.paidAtDisplay ? ` · ${props.appeal.paidAtDisplay}` : ""}
                </dd>
              </div>
            ) : null}
            {props.appeal.receivingBranchId || props.appeal.receivingOrganizationId ? (
              <div data-testid="ca-receiving-scope-meta">
                <dt>Охват принимающего</dt>
                <dd className={styles.mutedSmall}>
                  {[
                    props.appeal.receivingOrganizationId
                      ? `Орг. ${props.appeal.receivingOrganizationId}`
                      : null,
                    props.appeal.receivingBranchId ? `Филиал ${props.appeal.receivingBranchId}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Обновлено</dt>
              <dd>
                <time dateTime={props.appeal.updatedAt}>
                  {formatObserverDateTime(props.appeal.updatedAt)}
                </time>
              </dd>
            </div>
          </dl>

          <section className={styles.blocked} data-testid="ca-receiving-purchase-panel">
            <h3>{RECEIVING_DETAIL_PURCHASE_HEADING}</h3>
            {(() => {
              const wa = writableActions;
              const purchaseOrderId = props.appeal.purchaseOrderId;
              if (purchaseOrderId && wa?.onOpenPurchaseOrder) {
                return (
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    data-ca-action="receiving:purchase:open"
                    data-testid="ca-receiving-purchase-open"
                    onClick={wa.onOpenPurchaseOrder}
                  >
                    {RECEIVING_DETAIL_PURCHASE_MORE_LABEL}
                  </button>
                );
              }
              if (purchaseOrderId) {
                return (
                  <p className={styles.mutedSmall} data-testid="ca-receiving-purchase-order-hint">
                    {RECEIVING_DETAIL_PURCHASE_LINK_PENDING}
                  </p>
                );
              }
              const paidReview = wa?.paidReview;
              if (paidReview?.supported === true) {
                return (
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    data-ca-action="receiving:purchase:paid-review"
                    data-testid="ca-receiving-paid-review"
                    onClick={paidReview.onOpen}
                  >
                    {RECEIVING_DETAIL_MARK_PAID_LABEL}
                  </button>
                );
              }
              const markPaid = wa?.markPaid;
              if (markPaid?.supported === true) {
                return (
                  <button
                    type="button"
                    className={styles.ghostBtn}
                    data-ca-action="receiving:purchase:mark-paid"
                    data-testid="ca-receiving-mark-paid"
                    onClick={markPaid.onMarkPaid}
                  >
                    {RECEIVING_DETAIL_MARK_PAID_LABEL}
                  </button>
                );
              }
              return (
                <p className={styles.mutedSmall} data-testid="ca-receiving-purchase-unsupported">
                  {receivingPurchaseUnsupportedMessage(wa)}
                </p>
              );
            })()}
          </section>

          {!props.readOnly ? (
            <section className={styles.blocked} data-testid="ca-receiving-detail-notes">
              <h3>Заметки</h3>
              <label className={styles.field}>
                <textarea
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  disabled={!writableActions?.onSavePrivateNotes || writableActions.busy?.notes}
                  data-ca-input="detail-notes"
                  data-testid="ca-receiving-notes-input"
                  placeholder={RECEIVING_DETAIL_NOTES_PLACEHOLDER}
                />
              </label>
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="receiving:notes:save"
                data-testid="ca-receiving-notes-save"
                disabled={!writableActions?.onSavePrivateNotes || writableActions.busy?.notes}
                onClick={() => writableActions?.onSavePrivateNotes?.(notesDraft)}
              >
                {writableActions?.busy?.notes ? "Сохраняем…" : RECEIVING_DETAIL_NOTES_SAVE_LABEL}
              </button>
              {writableActions?.error?.notes ? (
                <p className={styles.mutedSmall} role="alert" data-testid="ca-receiving-notes-error">
                  {writableActions.error.notes}
                  {writableActions.onConflict ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        data-testid="ca-receiving-notes-retry"
                        onClick={writableActions.onConflict}
                      >
                        {RECEIVING_DETAIL_CONFLICT_RELOAD_LABEL}
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}
            </section>
          ) : null}

          <ReceivingAppealHistory
            entries={props.history}
            projection="receiving-full"
            emptyLabel="В истории пока нет записей."
          />
          {props.readOnly ? (
            <p className={styles.mutedSmall} data-testid="ca-receiving-appeal-readonly">
              Изменение этапа и внутренние заметки недоступны в режиме наблюдения.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
