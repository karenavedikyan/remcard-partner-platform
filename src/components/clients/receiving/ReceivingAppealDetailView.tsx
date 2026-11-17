"use client";

import { useEffect, useMemo, useState } from "react";
import { formatObserverDateTime } from "@/lib/clients-parity/observer-display";
import { ReceivingAppealTimeline } from "./ReceivingAppealTimeline";
import { ReceivingSubpageHead } from "./ReceivingSubpageHead";
import { certificateTermRows, type ReceivingCertificateTerm } from "./receiving-certificate-term";
import type { ReceivingAppealHistoryEntry } from "./ReceivingAppealHistory";
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
  RECEIVING_DETAIL_REOPEN_LABEL,
  RECEIVING_DETAIL_STAGE_APPLY_LABEL,
  RECEIVING_DETAIL_STAGE_SHIPPED_LABEL,
} from "./receiving-detail-user-copy";
import {
  STAGE_NEW,
  STAGE_REFUSED,
  STAGE_RETURN,
  STAGE_SHIPPED,
  appealHasPurchase,
  buildNextStepModel,
  buildStageStepper,
  canTransitionStage,
  type StageLike,
} from "./receiving-detail-stage-model";
import {
  formatCardDate,
  moscowNoonIso,
  stageBadgeClassName,
  toMoscowDay,
} from "./receiving-display";

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
  /** Frozen per-recipient term and this partner's purchases (same model as the public page / red card). */
  certTerm?: ReceivingCertificateTerm | null;
  privateNotes?: string | null;
  purchaseOrderId?: string | null;
  receivingPartnerUserId?: string | null;
  receivingOrganizationId?: string | null;
  receivingBranchId?: string | null;
  /** Client purchase projection from K8 `paidAmountKopecks` (not partner bonus payout). */
  paidDisplayLabel?: string | null;
  paidAtDisplay?: string | null;
  refusedReason?: string | null;
  shippedAt?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
};

/** `false` marks a failed mutation so the open panel (and the user's draft) stays on screen. */
export type ReceivingActionResult = void | boolean;

export type ReceivingSettingsAddResult<T> = { ok: true; value: T } | { ok: false; message: string };

/** P6 wires K1 PATCH handlers — P4 never calls API directly. */
export type ReceivingAppealDetailActions = {
  expectedRevision: number;
  workingStages: { id: string; label: string }[];
  refusalReasons?: string[];
  onSavePrivateNotes?: (privateNotes: string) => void | Promise<void>;
  onApplyStage?: (payload: {
    stageKey: string;
    refusedReason?: string | null;
    shippedAt?: string | null;
  }) => ReceivingActionResult | Promise<ReceivingActionResult>;
  /** Prototype «+ Своя причина» — saved into the organisation's refusal reasons. */
  onAddRefusalReason?: (label: string) => Promise<ReceivingSettingsAddResult<string>>;
  /** Prototype «+ Свой этап» — saved into the organisation's working stages. */
  onAddWorkingStage?: (label: string) => Promise<ReceivingSettingsAddResult<StageLike>>;
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
    | {
        supported: true;
        onMarkShipped: (shippedAtIso?: string | null) => ReceivingActionResult | Promise<ReceivingActionResult>;
      }
    | { supported: false; reason: string };
  /** P6 reload after K1 409 stale `expectedRevision`. */
  onConflict?: () => void;
  notesConflict?: boolean;
  notesSaveBlocked?: boolean;
  busy?: { notes?: boolean; stage?: boolean };
  error?: { notes?: string; stage?: string };
};

export type ReceivingAppealDetailReady = {
  status: "ready";
  appeal: ReceivingAppealDetailDto;
  history: ReceivingAppealHistoryEntry[];
  /** Organisation's own stages (also available when the card is read-only, for the stage ribbon). */
  workingStages?: StageLike[];
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

type Panel = null | "pick" | "refuse" | "ship" | "return";

const REFUSAL_TEXT_MAX = 200;

function receivingPurchaseUnsupportedMessage(
  actions: ReceivingAppealDetailActions | undefined,
): string {
  const paidReview = actions?.paidReview;
  if (paidReview !== undefined && paidReview.supported === false) return paidReview.reason;
  const markPaid = actions?.markPaid;
  if (markPaid !== undefined && markPaid.supported === false) return markPaid.reason;
  return RECEIVING_DETAIL_PURCHASE_UNAVAILABLE;
}

function composeRefusalText(reason: string, comment: string): string {
  const r = reason.trim();
  const c = comment.trim();
  return (c ? `${r} — ${c}` : r).slice(0, REFUSAL_TEXT_MAX);
}

type ReadyProps = ReceivingAppealDetailReady & { onBack: () => void };

function ReceivingAppealReadyBody({ appeal, history, readOnly, actions, workingStages: wsProp, onBack }: ReadyProps) {
  const writable = !readOnly && actions ? actions : undefined;
  const busy = Boolean(writable?.busy?.stage || writable?.busy?.notes || writable?.notesSaveBlocked);

  const notesAppealId = appeal.id;
  const serverNotes = appeal.privateNotes ?? "";
  const [notesState, setNotesState] = useState(() => ({
    appealId: notesAppealId,
    base: serverNotes,
    draft: serverNotes,
  }));
  const notesDraft = notesState.draft;

  const [panel, setPanel] = useState<Panel>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pickId, setPickId] = useState("");
  const [extraStages, setExtraStages] = useState<StageLike[]>([]);
  const [customStageOpen, setCustomStageOpen] = useState(false);
  const [customStageDraft, setCustomStageDraft] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [extraReasons, setExtraReasons] = useState<string[]>([]);
  const [customReasonOpen, setCustomReasonOpen] = useState(false);
  const [customReasonDraft, setCustomReasonDraft] = useState("");
  const [shipDay, setShipDay] = useState(() => toMoscowDay(new Date()));

  useEffect(() => {
    setNotesState((current) => ({
      appealId: notesAppealId,
      base: serverNotes,
      // A fresh revision must not discard local edits, including an intentional empty note.
      draft:
        current.appealId === notesAppealId && current.draft !== current.base
          ? current.draft
          : serverNotes,
    }));
  }, [notesAppealId, serverNotes]);

  useEffect(() => {
    setPanel(null);
    setLocalError(null);
    setPickId("");
    setReason("");
    setComment("");
    setCustomReasonOpen(false);
    setCustomStageOpen(false);
  }, [notesAppealId, appeal.stageId]);

  const orgStages = useMemo(() => {
    const base = writable?.workingStages ?? wsProp ?? [];
    const ids = new Set(base.map((s) => s.id));
    return [...base, ...extraStages.filter((s) => !ids.has(s.id))];
  }, [writable?.workingStages, wsProp, extraStages]);

  const hasPurchase = appealHasPurchase(appeal);
  const facts = { stageId: appeal.stageId, hasPurchase, shippedAt: appeal.shippedAt ?? null };
  const stepper = useMemo(
    () =>
      buildStageStepper({
        stageId: appeal.stageId,
        workingStages: orgStages,
        archivedStages: [{ id: appeal.stageId, label: appeal.stageLabel }],
        history,
      }),
    [appeal.stageId, appeal.stageLabel, orgStages, history],
  );
  const next = useMemo(
    () => buildNextStepModel(facts, orgStages, appeal.stageLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appeal.stageId, appeal.stageLabel, hasPurchase, appeal.shippedAt, orgStages],
  );

  const refusalReasons = useMemo(() => {
    const out: string[] = [];
    for (const r of [...(writable?.refusalReasons ?? []), ...extraReasons]) {
      if (r.trim() && !out.some((x) => x.toLowerCase() === r.trim().toLowerCase())) out.push(r.trim());
    }
    return out;
  }, [writable?.refusalReasons, extraReasons]);

  const isCertificate = appeal.originKind === "CERTIFICATE";
  const sourceText = appeal.sourceLabel?.trim() || (isCertificate ? "По сертификату" : "Добавлен вручную");
  const createdDay = appeal.createdAt ? toMoscowDay(new Date(appeal.createdAt)) : null;
  const today = toMoscowDay(new Date());
  const createdLabel = formatCardDate(appeal.createdAt);
  const termRows = certificateTermRows({ term: appeal.certTerm, legacyValidUntil: appeal.certValidUntil });

  async function runStage(
    payload: { stageKey: string; refusedReason?: string | null; shippedAt?: string | null },
    viaShippedConfirm = false,
  ) {
    if (!writable) return;
    setLocalError(null);
    let result: ReceivingActionResult;
    if (viaShippedConfirm && writable.shippedConfirm?.supported === true) {
      result = await writable.shippedConfirm.onMarkShipped(payload.shippedAt ?? null);
    } else if (writable.onApplyStage) {
      result = await writable.onApplyStage(payload);
    } else {
      return;
    }
    if (result !== false) setPanel(null);
  }

  function openPay() {
    if (writable?.paidReview?.supported === true) writable.paidReview.onOpen();
    else if (writable?.markPaid?.supported === true) writable.markPaid.onMarkPaid();
  }
  const canPayNow = writable?.paidReview?.supported === true || writable?.markPaid?.supported === true;

  function togglePanel(p: Exclude<Panel, null>) {
    setLocalError(null);
    setPanel((cur) => (cur === p ? null : p));
  }

  async function addCustomReason() {
    const label = customReasonDraft.trim();
    if (!label || !writable?.onAddRefusalReason) return;
    setLocalError(null);
    const res = await writable.onAddRefusalReason(label);
    if (!res.ok) {
      setLocalError(res.message);
      return;
    }
    setExtraReasons((cur) => [...cur, res.value]);
    setReason(res.value);
    setCustomReasonDraft("");
    setCustomReasonOpen(false);
  }

  async function addCustomStage() {
    const label = customStageDraft.trim();
    if (!label || !writable?.onAddWorkingStage) return;
    setLocalError(null);
    const res = await writable.onAddWorkingStage(label);
    if (!res.ok) {
      setLocalError(res.message);
      return;
    }
    setExtraStages((cur) => [...cur, res.value]);
    setPickId(res.value.id);
    setCustomStageDraft("");
    setCustomStageOpen(false);
  }

  function submitRefusal() {
    if (!reason.trim()) {
      setLocalError("Выберите причину отказа");
      return;
    }
    void runStage({ stageKey: STAGE_REFUSED, refusedReason: composeRefusalText(reason, comment) });
  }

  function submitShipment() {
    if (!shipDay) {
      setLocalError("Укажите дату отгрузки");
      return;
    }
    if (shipDay > today) {
      setLocalError("Дата отгрузки не может быть в будущем");
      return;
    }
    if (createdDay && shipDay < createdDay) {
      setLocalError("Дата отгрузки не может быть раньше создания обращения");
      return;
    }
    void runStage({ stageKey: STAGE_SHIPPED, shippedAt: shipDay === today ? null : moscowNoonIso(shipDay) }, true);
  }

  const pickOptions = useMemo(() => {
    const list = next.kind === "work" ? [...next.pickOptions] : [];
    for (const s of extraStages) {
      if (!list.some((o) => o.id === s.id) && canTransitionStage(facts, s.id).ok) list.push(s);
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, extraStages, appeal.stageId, hasPurchase, appeal.shippedAt]);

  const stageError = writable?.error?.stage ?? null;
  const commentMax = Math.max(0, REFUSAL_TEXT_MAX - reason.trim().length - 3);

  const nextCard = (() => {
    if (!writable) {
      return (
        <section className="panel stack ca-next" data-testid="ca-receiving-detail-stage">
          <h3>Что сейчас</h3>
          <p>
            <strong>{appeal.stageLabel}</strong>
            {appeal.stageId === STAGE_REFUSED && appeal.refusedReason ? ` — ${appeal.refusedReason}` : ""}
          </p>
          <p className="small muted">
            С <time dateTime={appeal.updatedAt}>{formatObserverDateTime(appeal.updatedAt)}</time>
          </p>
        </section>
      );
    }

    const common = (
      <>
        {stageError ? (
          <p className="ca-next-error" role="alert" data-testid="ca-receiving-stage-error">
            {stageError}
            {writable.onConflict ? (
              <>
                {" "}
                <button
                  type="button"
                  className="btn ghost"
                  data-testid="ca-receiving-stage-retry"
                  onClick={writable.onConflict}
                >
                  {RECEIVING_DETAIL_CONFLICT_RELOAD_LABEL}
                </button>
              </>
            ) : null}
          </p>
        ) : null}
        {localError ? (
          <p className="ca-next-error" role="alert" data-testid="ca-receiving-stage-local-error">
            {localError}
          </p>
        ) : null}
      </>
    );

    if (next.kind === "terminal") {
      const isReturn = appeal.stageId === STAGE_RETURN;
      return (
        <section className="panel stack ca-next ca-next--terminal" data-testid="ca-receiving-detail-stage">
          <h3>{next.title}</h3>
          <p>
            {isReturn
              ? "Возврат оформлен."
              : appeal.refusedReason?.trim()
                ? `Причина: ${appeal.refusedReason.trim()}`
                : "Причина не указана."}
          </p>
          {isReturn ? (
            <p className="small muted">Обращение закрыто — этап больше изменить нельзя.</p>
          ) : (
            <div className="ca-next-actions">
              <button
                type="button"
                className="btn ghost small-btn"
                data-ca-action="receiving:stage:reopen"
                data-testid="ca-receiving-reopen"
                disabled={busy || !writable.onApplyStage}
                onClick={() => void runStage({ stageKey: STAGE_NEW, refusedReason: null })}
              >
                {writable.busy?.stage ? "Возвращаем…" : RECEIVING_DETAIL_REOPEN_LABEL}
              </button>
            </div>
          )}
          {common}
        </section>
      );
    }

    return (
      <section className="panel stack ca-next" data-testid="ca-receiving-detail-stage">
        <h3>{next.title}</h3>
        <div className="ca-next-actions">
          {next.kind === "paid" && next.primary ? (
            <button
              type="button"
              className="btn primary"
              data-ca-action="receiving:stage:shipped"
              data-testid="ca-receiving-mark-shipped"
              aria-expanded={panel === "ship"}
              disabled={busy}
              onClick={() => togglePanel("ship")}
            >
              {RECEIVING_DETAIL_STAGE_SHIPPED_LABEL}
            </button>
          ) : null}
          {next.kind === "shipped" && next.returnAction ? (
            <button
              type="button"
              className="btn"
              data-testid="ca-receiving-return"
              aria-expanded={panel === "return"}
              disabled={busy}
              onClick={() => togglePanel("return")}
            >
              {next.returnAction.label}
            </button>
          ) : null}
          {next.kind === "work" && next.primary?.kind === "stage" ? (
            <button
              type="button"
              className="btn primary"
              data-testid="ca-receiving-next-primary"
              disabled={busy || !writable.onApplyStage}
              onClick={() => {
                if (next.primary?.kind === "stage") void runStage({ stageKey: next.primary.stageId });
              }}
            >
              {writable.busy?.stage ? "Сохраняем…" : next.primary.label}
            </button>
          ) : null}
          {next.kind === "work" && next.primary?.kind === "pay" ? (
            <button
              type="button"
              className="btn primary"
              data-ca-action="receiving:purchase:paid-review"
              data-testid="ca-receiving-paid-review"
              disabled={busy || !canPayNow}
              onClick={openPay}
            >
              {RECEIVING_DETAIL_MARK_PAID_LABEL}
            </button>
          ) : null}
          {next.kind === "work" && next.canPay ? (
            <button
              type="button"
              className="btn ghost"
              data-ca-action="receiving:purchase:mark-paid"
              data-testid="ca-receiving-mark-paid"
              disabled={busy || !canPayNow}
              onClick={openPay}
            >
              {RECEIVING_DETAIL_MARK_PAID_LABEL}
            </button>
          ) : null}
          {next.kind === "work" && next.canRefuse ? (
            <button
              type="button"
              className="btn ghost"
              data-testid="ca-receiving-refuse"
              aria-expanded={panel === "refuse"}
              disabled={busy || !writable.onApplyStage}
              onClick={() => togglePanel("refuse")}
            >
              Клиент отказался
            </button>
          ) : null}
        </div>

        {next.kind === "work" && next.primary?.kind === "pay" && !canPayNow ? (
          <p className="ca-next-hint" data-testid="ca-receiving-purchase-unsupported">
            {receivingPurchaseUnsupportedMessage(writable)}
          </p>
        ) : null}
        {next.kind === "paid" && !next.primary && next.blockedReason ? (
          <p className="ca-next-hint" data-testid="ca-receiving-ship-blocked">
            {next.blockedReason}
          </p>
        ) : null}
        {next.kind === "shipped" && !next.returnAction && next.blockedReason ? (
          <p className="ca-next-hint" data-testid="ca-receiving-return-blocked">
            {next.blockedReason}
          </p>
        ) : null}

        {next.kind === "work" && pickOptions.length > 0 ? (
          <button
            type="button"
            className="btn ghost small-btn"
            data-testid="ca-receiving-pick-toggle"
            aria-expanded={panel === "pick"}
            disabled={busy || !writable.onApplyStage}
            onClick={() => togglePanel("pick")}
          >
            Выбрать другой этап
          </button>
        ) : null}

        {panel === "pick" && next.kind === "work" ? (
          <div className="ca-next-panel" role="group" aria-label="Выбор этапа" data-testid="ca-receiving-pick-panel">
            <h4>Выбор этапа</h4>
            <label className="field">
              Перевести в этап
              <select
                value={pickId}
                onChange={(e) => setPickId(e.target.value)}
                disabled={busy}
                data-testid="ca-receiving-stage-select"
              >
                <option value="">— выберите —</option>
                {pickOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            {writable.onAddWorkingStage ? (
              customStageOpen ? (
                <div className="ca-custom-inline">
                  <label className="field">
                    Название этапа
                    <input
                      type="text"
                      maxLength={60}
                      value={customStageDraft}
                      onChange={(e) => setCustomStageDraft(e.target.value)}
                      data-testid="ca-receiving-custom-stage-input"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || !customStageDraft.trim()}
                    data-testid="ca-receiving-custom-stage-add"
                    onClick={() => void addCustomStage()}
                  >
                    Добавить
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ca-chip ca-chip--add"
                  data-testid="ca-receiving-custom-stage-open"
                  onClick={() => setCustomStageOpen(true)}
                >
                  + Свой этап
                </button>
              )
            ) : null}
            <div className="ca-next-actions">
              <button type="button" className="btn ghost" onClick={() => setPanel(null)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!pickId || busy || !writable.onApplyStage}
                data-ca-action="receiving:stage:apply"
                data-testid="ca-receiving-stage-apply"
                onClick={() => void runStage({ stageKey: pickId })}
              >
                {writable.busy?.stage ? "Сохраняем…" : RECEIVING_DETAIL_STAGE_APPLY_LABEL}
              </button>
            </div>
          </div>
        ) : null}

        {panel === "refuse" ? (
          <div className="ca-next-panel" role="group" aria-label="Клиент отказался" data-testid="ca-receiving-refuse-panel">
            <h4>Клиент отказался</h4>
            <div className="ca-chips" role="group" aria-label="Причина отказа">
              {refusalReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`ca-chip${reason === r ? " is-selected" : ""}`}
                  aria-pressed={reason === r}
                  data-testid="ca-receiving-refusal-chip"
                  onClick={() => {
                    setReason(r);
                    setLocalError(null);
                  }}
                >
                  {r}
                </button>
              ))}
              {writable.onAddRefusalReason && !customReasonOpen ? (
                <button
                  type="button"
                  className="ca-chip ca-chip--add"
                  data-testid="ca-receiving-custom-reason-open"
                  onClick={() => setCustomReasonOpen(true)}
                >
                  + Своя причина
                </button>
              ) : null}
            </div>
            {customReasonOpen ? (
              <div className="ca-custom-inline">
                <label className="field">
                  Своя причина
                  <input
                    type="text"
                    maxLength={80}
                    value={customReasonDraft}
                    onChange={(e) => setCustomReasonDraft(e.target.value)}
                    data-testid="ca-receiving-custom-reason-input"
                  />
                </label>
                <button
                  type="button"
                  className="btn"
                  disabled={busy || !customReasonDraft.trim()}
                  data-testid="ca-receiving-custom-reason-add"
                  onClick={() => void addCustomReason()}
                >
                  Добавить
                </button>
              </div>
            ) : null}
            <label className="field">
              Комментарий
              <textarea
                rows={2}
                value={comment}
                maxLength={commentMax || undefined}
                disabled={Boolean(reason) && commentMax <= 0}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Необязательно"
                data-testid="ca-receiving-refusal-comment"
              />
            </label>
            <div className="ca-next-actions">
              <button type="button" className="btn ghost" onClick={() => setPanel(null)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                data-testid="ca-receiving-refusal-submit"
                onClick={submitRefusal}
              >
                {writable.busy?.stage ? "Сохраняем…" : "Зафиксировать отказ"}
              </button>
            </div>
          </div>
        ) : null}

        {panel === "ship" ? (
          <div className="ca-next-panel" role="group" aria-label="Отметить отгрузку" data-testid="ca-receiving-ship-panel">
            <h4>Отметить отгрузку</h4>
            <label className="field">
              Дата отгрузки
              <input
                type="date"
                value={shipDay}
                max={today}
                min={createdDay ?? undefined}
                onChange={(e) => {
                  setShipDay(e.target.value);
                  setLocalError(null);
                }}
                data-testid="ca-receiving-ship-date"
              />
            </label>
            <div className="ca-next-actions">
              <button type="button" className="btn ghost" onClick={() => setPanel(null)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                data-testid="ca-receiving-ship-confirm"
                onClick={submitShipment}
              >
                {writable.busy?.stage ? "Сохраняем…" : "Подтвердить отгрузку"}
              </button>
            </div>
          </div>
        ) : null}

        {panel === "return" ? (
          <div className="ca-next-panel" role="group" aria-label="Оформить возврат" data-testid="ca-receiving-return-panel">
            <h4>Оформить возврат</h4>
            <p className="ca-next-hint">Возврат закрывает обращение: после него этап изменить нельзя.</p>
            <div className="ca-next-actions">
              <button type="button" className="btn ghost" onClick={() => setPanel(null)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                data-testid="ca-receiving-return-confirm"
                onClick={() => void runStage({ stageKey: STAGE_RETURN })}
              >
                {writable.busy?.stage ? "Сохраняем…" : "Подтвердить возврат"}
              </button>
            </div>
          </div>
        ) : null}

        {common}
      </section>
    );
  })();

  const purchaseCard =
    hasPurchase || appeal.paidDisplayLabel ? (
      <section className="panel stack ca-side-card" data-testid="ca-receiving-purchase-panel">
        <h3>{RECEIVING_DETAIL_PURCHASE_HEADING}</h3>
        <dl className="ca-dl">
          <div data-testid="ca-receiving-purchase-paid">
            <dt>Сумма покупки до скидки</dt>
            <dd>{appeal.paidDisplayLabel ?? "—"}</dd>
          </div>
          {appeal.paidAtDisplay ? (
            <div>
              <dt>Оплачено</dt>
              <dd>{appeal.paidAtDisplay}</dd>
            </div>
          ) : null}
        </dl>
        {appeal.purchaseOrderId && writable?.onOpenPurchaseOrder ? (
          <button
            type="button"
            className="btn"
            data-ca-action="receiving:purchase:open"
            data-testid="ca-receiving-purchase-open"
            onClick={writable.onOpenPurchaseOrder}
          >
            {RECEIVING_DETAIL_PURCHASE_MORE_LABEL}
          </button>
        ) : appeal.purchaseOrderId ? (
          <p className="small muted" data-testid="ca-receiving-purchase-order-hint">
            {RECEIVING_DETAIL_PURCHASE_LINK_PENDING}
          </p>
        ) : null}
      </section>
    ) : null;

  return (
    <div className="stack ca-section" data-testid="ca-receiving-appeal-detail">
      <ReceivingSubpageHead
        onBack={onBack}
        titleId="ca-receiving-appeal-title"
        title={appeal.clientName}
        badge={
          <span
            className={stageBadgeClassName(appeal.stageId, appeal.stageLabel)}
            data-testid="ca-receiving-detail-stage-pill"
          >
            {appeal.stageLabel}
          </span>
        }
        subtitle={`${createdLabel ? `Обращение от ${createdLabel} · ` : ""}${sourceText}${readOnly ? " · только просмотр" : ""}`}
        subtitleTestId="ca-receiving-detail-context"
      />

      <div className="ca-detail-layout">
        <div className="ca-detail-main">
          <div className="ca-detail-main-inner">
            <ol className="ca-stepper" aria-label="Этапы обращения" data-testid="ca-receiving-stepper">
              {stepper.map((s) => (
                <li
                  key={s.id}
                  className={`ca-step ca-step--${s.state}`}
                  aria-current={s.state === "current" ? "step" : undefined}
                  data-step-state={s.state}
                >
                  <span className="ca-step-dot" aria-hidden="true" />
                  <span className="ca-step-label">{s.label}</span>
                  {s.state === "done" ? <span className="sr-only"> (пройден)</span> : null}
                </li>
              ))}
            </ol>
            {nextCard}
            <ReceivingAppealTimeline entries={history} />
          </div>
        </div>

        <aside className="ca-detail-side" aria-label="Сведения об обращении">
          <section className="panel stack ca-side-card" data-testid="ca-receiving-client-card">
            <h3>Клиент</h3>
            <p>
              <strong>{appeal.clientName}</strong>
            </p>
            <p className="small muted">{appeal.clientContact?.trim() || "Контакт не указан"}</p>
            <dl className="ca-dl">
              <div>
                <dt>Запрос</dt>
                <dd>{appeal.interest?.trim() || "—"}</dd>
              </div>
              <div>
                <dt>Источник</dt>
                <dd>{sourceText}</dd>
              </div>
              {appeal.clientCity?.trim() ? (
                <div>
                  <dt>Город</dt>
                  <dd>{appeal.clientCity}</dd>
                </div>
              ) : null}
              {appeal.budgetHint?.trim() ? (
                <div>
                  <dt>Бюджет</dt>
                  <dd>{appeal.budgetHint}</dd>
                </div>
              ) : null}
              <div>
                <dt>Обновлено</dt>
                <dd>
                  <time dateTime={appeal.updatedAt}>{formatObserverDateTime(appeal.updatedAt)}</time>
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel stack ca-side-card" data-testid="ca-receiving-cert-card">
            <h3>Сертификат</h3>
            {isCertificate ? (
              <dl className="ca-dl" data-testid="ca-receiving-cert-meta">
                <div>
                  <dt>Направил</dt>
                  <dd>{appeal.referrerPartnerName?.trim() || "Имя не указано"}</dd>
                </div>
                <div>
                  <dt>Скидка</dt>
                  <dd>{appeal.discountPercent != null ? `${appeal.discountPercent}%` : "—"}</dd>
                </div>
                {termRows.map((row) => (
                  <div key={row.label} data-testid="ca-receiving-cert-term-row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="muted">{RECEIVING_DETAIL_MANUAL_CERT_NOTE}</p>
            )}
          </section>

          {purchaseCard}

          {!readOnly ? (
            <section className="panel stack ca-side-card" data-testid="ca-receiving-detail-notes">
              <h3>Заметки</h3>
              <label className="field">
                <textarea
                  rows={3}
                  value={notesDraft}
                  aria-label="Заметки — только для вашей команды"
                  onChange={(e) => {
                    const draft = e.target.value;
                    setNotesState((current) => ({ ...current, draft }));
                  }}
                  disabled={!writable?.onSavePrivateNotes || writable.busy?.notes}
                  data-ca-input="detail-notes"
                  data-testid="ca-receiving-notes-input"
                  placeholder={RECEIVING_DETAIL_NOTES_PLACEHOLDER}
                />
              </label>
              <button
                type="button"
                className="btn"
                data-ca-action="receiving:notes:save"
                data-testid="ca-receiving-notes-save"
                disabled={!writable?.onSavePrivateNotes || writable.busy?.notes || writable.notesSaveBlocked}
                onClick={() => writable?.onSavePrivateNotes?.(notesDraft)}
              >
                {writable?.busy?.notes ? "Сохраняем…" : RECEIVING_DETAIL_NOTES_SAVE_LABEL}
              </button>
              {writable?.error?.notes ? (
                <p className="ca-next-error" role="alert" data-testid="ca-receiving-notes-error">
                  {writable.error.notes}
                  {writable.onConflict ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="btn ghost"
                        data-testid="ca-receiving-notes-retry"
                        onClick={writable.onConflict}
                      >
                        {RECEIVING_DETAIL_CONFLICT_RELOAD_LABEL}
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}
              {writable?.notesConflict && !writable.notesSaveBlocked ? (
                <p className="small muted" data-testid="ca-receiving-notes-server-value" style={{ whiteSpace: "pre-wrap" }}>
                  Заметка в актуальной карточке:{"\n"}
                  {appeal.privateNotes || "Заметка отсутствует."}
                </p>
              ) : null}
            </section>
          ) : null}

          <details className="ca-diag" data-testid="ca-receiving-diagnostics">
            <summary>Служебные сведения</summary>
            <dl>
              <div>
                <dt>Номер обращения</dt>
                <dd>
                  <code data-testid="ca-receiving-appeal-id">{appeal.id}</code>
                </dd>
              </div>
              {appeal.certificateId?.trim() ? (
                <div>
                  <dt>Номер сертификата</dt>
                  <dd>{appeal.certificateId}</dd>
                </div>
              ) : null}
              {appeal.receivingOrganizationId || appeal.receivingBranchId ? (
                <div data-testid="ca-receiving-scope-meta">
                  <dt>Охват принимающего</dt>
                  <dd>
                    {[
                      appeal.receivingOrganizationId ? `Орг. ${appeal.receivingOrganizationId}` : null,
                      appeal.receivingBranchId ? `Филиал ${appeal.receivingBranchId}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </details>
        </aside>
      </div>

      {readOnly ? (
        <p className="small muted" data-testid="ca-receiving-appeal-readonly">
          Изменение этапа и внутренние заметки недоступны в режиме наблюдения.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Prototype `renderDetailPage`: header with the client name, stage ribbon, next-step card, timeline
 * and the client/certificate/purchase/notes side column. Mutations only via `actions`; the stage
 * choices come from the server-aligned `receiving-detail-stage-model`.
 */
export function ReceivingAppealDetailView(props: ReceivingAppealDetailProps) {
  const { onBack } = props;

  if (props.status === "missing") {
    return (
      <div className="stack ca-section" data-testid="ca-receiving-appeal-detail">
        <button type="button" className="ca-back" data-testid="ca-clients-back" onClick={onBack}>
          <span aria-hidden="true">←</span> К списку клиентов
        </button>
        <section className="panel stack" data-testid="ca-receiving-appeal-missing">
          <h2>Обращение не найдено</h2>
          <p className="small muted">
            {props.appealId
              ? `Обращение «${props.appealId}» недоступно в текущем списке.`
              : "Обращение недоступно в текущем списке."}
          </p>
        </section>
      </div>
    );
  }

  if (props.status === "error") {
    return (
      <div className="stack ca-section" data-testid="ca-receiving-appeal-detail">
        <button type="button" className="ca-back" data-testid="ca-clients-back" onClick={onBack}>
          <span aria-hidden="true">←</span> К списку клиентов
        </button>
        <section className="panel stack" data-testid="ca-receiving-appeal-error" role="alert">
          <h2>Данные обращения недоступны</h2>
          <p className="small muted">{props.message}</p>
          {props.onRetry ? (
            <button type="button" className="btn" onClick={props.onRetry}>
              Повторить
            </button>
          ) : null}
        </section>
      </div>
    );
  }

  return <ReceivingAppealReadyBody {...props} />;
}
