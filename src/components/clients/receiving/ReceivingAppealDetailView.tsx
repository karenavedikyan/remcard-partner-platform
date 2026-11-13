"use client";

import { useEffect, useMemo, useState } from "react";
import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import styles from "../observer/observer.module.css";
import {
  ReceivingAppealHistory,
  type ReceivingAppealHistoryEntry,
} from "./ReceivingAppealHistory";
import { filterStageOptionsForDirectPatch } from "./receiving-detail-actions-contract";

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

/**
 * Prototype `renderDetailPage` body — notes, stage controls, purchase affordances.
 * Mutations only via `actions` callbacks (P6 → K1 profile PATCH + stage PATCH).
 */
export function ReceivingAppealDetailView(props: ReceivingAppealDetailProps) {
  const { onBack } = props;
  const ready = props.status === "ready" ? props : null;
  const canEdit = Boolean(ready && !ready.readOnly && ready.actions);
  const actions = canEdit ? ready!.actions : undefined;

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
    if (!actions) return [];
    return stageOptionsForPicker(ready!.appeal.stageId, actions.workingStages);
  }, [actions, ready?.appeal.stageId]);

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
            <section className={styles.blocked} data-testid="ca-receiving-detail-stage">
              <h3>Следующий шаг</h3>
              {props.appeal.stageId === "sys_paid" && actions?.shippedConfirm?.supported ? (
                <button
                  type="button"
                  className={styles.ghostBtn}
                  data-ca-action="receiving:stage:shipped"
                  data-testid="ca-receiving-mark-shipped"
                  disabled={actions.busy?.stage}
                  onClick={actions.shippedConfirm.onMarkShipped}
                >
                  Отметить отгрузку
                </button>
              ) : null}
              <label className={styles.field}>
                Перевести в этап
                <select
                  value={stagePick}
                  onChange={(e) => setStagePick(e.target.value)}
                  disabled={!actions?.onApplyStage || actions.busy?.stage}
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
              {stagePick === "sys_refused" && (actions.refusalReasons?.length ?? 0) > 0 ? (
                <label className={styles.field}>
                  Причина отказа
                  <select
                    value={refusalPick}
                    onChange={(e) => setRefusalPick(e.target.value)}
                    data-testid="ca-receiving-refusal-select"
                  >
                    <option value="">— выберите —</option>
                    {actions.refusalReasons!.map((r) => (
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
                {actions.busy?.stage ? "Сохраняем…" : "Перевести"}
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
                        Обновить карточку
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}
            </section>
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
                <dd className={styles.mutedSmall}>Без сертификата — направившего и скидки нет.</dd>
              </div>
            )}
            {props.appeal.paidDisplayLabel ? (
              <div data-testid="ca-receiving-purchase-paid">
                <dt>Оплата клиентом</dt>
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
            <h3>Покупка</h3>
            {props.appeal.purchaseOrderId && actions?.onOpenPurchaseOrder ? (
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="receiving:purchase:open"
                data-testid="ca-receiving-purchase-open"
                onClick={actions.onOpenPurchaseOrder}
              >
                Подробнее о покупке ({props.appeal.purchaseOrderId})
              </button>
            ) : props.appeal.purchaseOrderId ? (
              <p className={styles.mutedSmall} data-testid="ca-receiving-purchase-order-hint">
                Заказ {props.appeal.purchaseOrderId} — откройте деталь покупки в кошельке (P6
                onOpenPurchaseOrder).
              </p>
            ) : actions?.paidReview?.supported ? (
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="receiving:purchase:paid-review"
                data-testid="ca-receiving-paid-review"
                onClick={actions.paidReview.onOpen}
              >
                Отметить оплату
              </button>
            ) : actions?.markPaid?.supported ? (
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="receiving:purchase:mark-paid"
                data-testid="ca-receiving-mark-paid"
                onClick={actions.markPaid.onMarkPaid}
              >
                Отметить оплату
              </button>
            ) : (
              <p className={styles.mutedSmall} data-testid="ca-receiving-purchase-unsupported">
                {actions?.paidReview?.reason ??
                  actions?.markPaid?.reason ??
                  "Оплата — через кошелёк/заказ (/scanner или история покупок), не PATCH этапа «Оплачено»."}
              </p>
            )}
          </section>

          {!props.readOnly ? (
            <section className={styles.blocked} data-testid="ca-receiving-detail-notes">
              <h3>Заметки</h3>
              <p className={styles.mutedSmall}>Только для вашей команды. Сохранение — profile PATCH (P6).</p>
              <label className={styles.field}>
                <textarea
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  disabled={!actions?.onSavePrivateNotes || actions.busy?.notes}
                  data-ca-input="detail-notes"
                  data-testid="ca-receiving-notes-input"
                  placeholder="Только для вашей команды"
                />
              </label>
              <button
                type="button"
                className={styles.ghostBtn}
                data-ca-action="receiving:notes:save"
                data-testid="ca-receiving-notes-save"
                disabled={!actions?.onSavePrivateNotes || actions.busy?.notes}
                onClick={() => actions?.onSavePrivateNotes?.(notesDraft)}
              >
                {actions?.busy?.notes ? "Сохраняем…" : "Сохранить"}
              </button>
              {actions?.error?.notes ? (
                <p className={styles.mutedSmall} role="alert" data-testid="ca-receiving-notes-error">
                  {actions.error.notes}
                  {actions.onConflict ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className={styles.ghostBtn}
                        data-testid="ca-receiving-notes-retry"
                        onClick={actions.onConflict}
                      >
                        Обновить карточку
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
