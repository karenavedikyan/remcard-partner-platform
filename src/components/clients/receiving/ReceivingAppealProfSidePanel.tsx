"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import type { ReceivingAppealProfDrawerFormHandle } from "./ReceivingAppealProfDrawerForm";
import {
  parseProfAppealDetailWire,
  profAppealRowSubtitle,
  profStageStatusClass,
  REMCARD_CLIENT_LOGIN_URL,
  type CommercialProposalDeliveryWire,
  type ProfAppealDetailState,
  type ProfAppealListRow,
} from "@/lib/clients-parity/prof-appeals-adapter";
import {
  fetchReceivingAppealDetailWire,
  type ReceivingPartnerSettings,
  type ReceivingReadScope,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealDetailHost } from "./ReceivingAppealDetailHost";
import { ReceivingAppealProfDrawerForm } from "./ReceivingAppealProfDrawerForm";
import { ReceivingAppealTimeline } from "./ReceivingAppealTimeline";
import { ReceivingCommercialOfferDialog } from "./ReceivingCommercialOfferDialog";
import { useCopyDisplayedValue } from "./useCopyDisplayedValue";
import styles from "./receiving.module.css";

export type ReceivingAppealProfSidePanelProps = {
  appealId: string | null;
  row: ProfAppealListRow | null;
  readOnly?: boolean;
  readScope?: ReceivingReadScope | null;
  settings?: ReceivingPartnerSettings | null;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onAppealMutated?: () => void | Promise<void>;
  partnerDisplayName?: string;
  partnerWorkPhones?: Array<{ id: string; label: string; number: string }>;
  partnerLogoUrl?: string | null;
  partnerType?: string | null;
  branchLabel?: string | null;
  offerOpen: boolean;
  onOfferOpenChange: (open: boolean) => void;
};

type DetailPhase = "loading" | "prof" | "legacy" | "error";

export function ReceivingAppealProfSidePanel({
  appealId,
  row,
  readOnly = false,
  readScope,
  settings,
  returnFocusRef,
  onClose,
  onAppealMutated,
  partnerDisplayName = "Партнёр",
  partnerWorkPhones = [],
  partnerLogoUrl = null,
  partnerType = null,
  branchLabel = null,
  offerOpen,
  onOfferOpenChange,
}: ReceivingAppealProfSidePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const { copy, copiedKey } = useCopyDisplayedValue();
  const open = Boolean(appealId);
  const [detailPhase, setDetailPhase] = useState<DetailPhase>("loading");
  const [profDetail, setProfDetail] = useState<ProfAppealDetailState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commercialProposal, setCommercialProposal] = useState<CommercialProposalDeliveryWire | null>(null);
  const formRef = useRef<ReceivingAppealProfDrawerFormHandle>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formSaved, setFormSaved] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    setFormSaved(false);
  }, [appealId, profDetail?.revision]);

  useEffect(() => {
    const panelLocked = readOnly || profDetail?.detailReadOnly === true;
    if (!open || detailPhase !== "prof" || !profDetail || panelLocked) return;
    const t = window.setTimeout(() => {
      titleInputRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, appealId, detailPhase, profDetail, readOnly]);

  useEffect(() => {
    if (!appealId) return;
    let cancelled = false;
    setDetailPhase("loading");
    setProfDetail(null);
    setLoadError(null);
    setCommercialProposal(null);
    void fetchReceivingAppealDetailWire(appealId, readScope).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setDetailPhase("error");
        setLoadError(res.message);
        return;
      }
      const prof = parseProfAppealDetailWire(res.wire, {
        scopeAll: readScope?.branchScope === "all",
      });
      if (prof) {
        setProfDetail(prof);
        setCommercialProposal(prof.appeal.commercialProposal);
        setDetailPhase("prof");
        return;
      }
      setDetailPhase("legacy");
    });
    return () => {
      cancelled = true;
    };
  }, [appealId, readScope]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onDialogClose = () => {
      returnFocusRef?.current?.focus({ preventScroll: true });
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, [returnFocusRef]);

  if (!appealId) return null;

  const appealRow = profDetail?.appeal ?? row;
  const panelReadOnly = readOnly || profDetail?.detailReadOnly === true;
  const title =
    profDetail?.appeal.appealTitle?.trim() ||
    row?.appealTitle?.trim() ||
    row?.clientName ||
    "Обращение";
  const prepareAllowed =
    commercialProposal?.prepareAllowed ?? profDetail?.appeal.commercialProposal.prepareAllowed ?? false;
  const canPrepareOffer = !panelReadOnly && prepareAllowed;
  const hasCabinet = profDetail?.appeal.remCard.inCabinet ?? row?.remCard.inCabinet === true;
  const publicId = profDetail?.appeal.remCard.publicId?.trim() || null;
  const inviteUrl = profDetail?.appeal.remCard.inviteLoginUrl?.trim() || REMCARD_CLIENT_LOGIN_URL;
  const statusLabel = profDetail?.appeal.stageLabel ?? row?.stageLabel ?? null;
  const stageId = profDetail?.appeal.stageId ?? row?.stageId ?? "";
  const branchEffective =
    profDetail?.appeal.receivingBranchLabel?.trim() ??
    row?.receivingBranchLabel?.trim() ??
    branchLabel?.trim() ??
    null;
  const subtitle = appealRow ? profAppealRowSubtitle(appealRow, branchEffective) : null;
  const createdBy =
    profDetail?.appeal.createdByLabel?.trim() ?? row?.createdByLabel?.trim() ?? null;
  const certificate = profDetail?.appeal.certificatePromoCode?.trim() ?? row?.certificatePromoCode?.trim() ?? null;
  const historyCount = profDetail?.history.length ?? 0;

  return (
    <>
      <dialog
        ref={dialogRef}
        className={styles.profSidePanel}
        data-testid="ca-prof-side-panel"
        aria-labelledby={titleId}
        onClose={onClose}
      >
        <div className="prof-side-shell">
          <ProfSidePanelHeader
            titleId={titleId}
            title={title}
            readOnly={panelReadOnly}
            statusLabel={statusLabel}
            statusClass={profStageStatusClass(stageId)}
            subtitle={subtitle}
            onClose={onClose}
            onCloseRefFocus={panelReadOnly}
          />
          <div className="prof-side-scroll editor-body">
            {detailPhase === "loading" ? (
              <p className="notice small" data-testid="ca-prof-detail-loading">
                Загрузка карточки…
              </p>
            ) : null}
            {detailPhase === "error" ? (
              <p className="notice accent" role="alert" data-testid="ca-prof-detail-error">
                {loadError ?? "Не удалось загрузить обращение."}
              </p>
            ) : null}

            {detailPhase === "prof" && profDetail ? (
              <>
                <section className="appeal-client-box" aria-label="Клиент RemCard" data-testid="ca-prof-client-box">
                  <div className="appeal-client-box-row">
                    <div className="certificate-summary" data-testid="ca-prof-client-id-plate">
                      <span>ID клиента RemCard</span>
                      <strong>{publicId ?? "Нет ID"}</strong>
                      {publicId ? (
                        <CopyIconButton
                          caption="ID клиента RemCard"
                          copied={copiedKey === "client-public-id"}
                          onCopy={() => void copy("client-public-id", publicId)}
                        />
                      ) : null}
                    </div>
                    {!panelReadOnly ? (
                      hasCabinet ? (
                        <ProfSideActions
                          canSendOffer={canPrepareOffer}
                          sendBlockedReason={
                            commercialProposal?.sendEnabled === false
                              ? commercialProposal.sendDisabledReason
                              : null
                          }
                          onSend={() => onOfferOpenChange(true)}
                        />
                      ) : (
                        <RegistrationHelp
                          url={inviteUrl}
                          copied={copiedKey === "registration"}
                          onCopy={() => void copy("registration", inviteUrl)}
                        />
                      )
                    ) : null}
                  </div>
                </section>

                <div className="certificate-summary" data-testid="ca-prof-certificate">
                  <span>Номер сертификата RemCard</span>
                  <strong>{certificate ?? "Не привязан"}</strong>
                  {certificate ? (
                    <CopyIconButton
                      caption="Номер сертификата RemCard"
                      withLabel
                      copied={copiedKey === "certificate"}
                      onCopy={() => void copy("certificate", certificate)}
                    />
                  ) : null}
                </div>

                {panelReadOnly ? (
                  <p className="review" data-testid="ca-prof-drawer-readonly">
                    У этой роли нет права редактировать обращение.
                  </p>
                ) : null}

                <ReceivingAppealProfDrawerForm
                  ref={formRef}
                  key={appealId}
                  detail={profDetail}
                  settings={settings}
                  readScope={readScope}
                  titleFocusRef={titleInputRef}
                  onDetailChange={setProfDetail}
                  onSaved={onAppealMutated}
                  onBusyChange={setFormBusy}
                  onSaveStateChange={setFormSaved}
                />

                {createdBy ? (
                  <p className="help" data-testid="ca-prof-created-by">
                    Создал: {createdBy}. Статус здесь не меняется.
                  </p>
                ) : null}

                <div className="prof-lifecycle-host" data-testid="ca-prof-lifecycle-host">
                  <ReceivingAppealDetailHost
                    appealId={appealId}
                    readOnly={panelReadOnly}
                    readScope={readScope}
                    companionProfPanel
                    onBack={onClose}
                    onAppealMutated={onAppealMutated}
                  />
                </div>

                <details className="history" data-testid="ca-prof-history">
                  <summary>История изменений · {historyCount}</summary>
                  <ReceivingAppealTimeline entries={profDetail.history} emptyLabel="Пока изменений нет." />
                </details>
              </>
            ) : detailPhase === "legacy" ? (
              <ReceivingAppealDetailHost
                appealId={appealId}
                readOnly={panelReadOnly}
                readScope={readScope}
                onBack={onClose}
                onAppealMutated={onAppealMutated}
              />
            ) : null}
          </div>
          {detailPhase === "prof" && profDetail && !profDetail.detailReadOnly && !readOnly ? (
            <footer className="prof-drawer-footer editor-foot" data-testid="ca-prof-drawer-footer">
              <div className="form-actions">
                <button
                  type="button"
                  className="btn secondary"
                  disabled={formBusy}
                  onClick={() => {
                    formRef.current?.resetDraft();
                    onClose();
                  }}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={formBusy}
                  data-testid="ca-prof-save-profile"
                  onClick={() => void formRef.current?.save()}
                >
                  {formBusy ? "Сохранение…" : formSaved ? "Сохранено" : "Сохранить"}
                </button>
              </div>
            </footer>
          ) : null}
        </div>
      </dialog>
      {row && offerOpen ? (
        <ReceivingCommercialOfferDialog
          open={offerOpen}
          appeal={profDetail?.appeal ?? row}
          partnerDisplayName={partnerDisplayName}
          partnerWorkPhones={partnerWorkPhones}
          partnerLogoUrl={partnerLogoUrl}
          partnerType={partnerType}
          commercialProposal={commercialProposal ?? profDetail?.appeal.commercialProposal}
          onClose={() => onOfferOpenChange(false)}
        />
      ) : null}
    </>
  );
}

function ProfSidePanelHeader({
  titleId,
  title,
  readOnly,
  statusLabel,
  statusClass,
  subtitle,
  onClose,
  onCloseRefFocus,
}: {
  titleId: string;
  title: string;
  readOnly: boolean;
  statusLabel: string | null;
  statusClass: string;
  subtitle: string | null;
  onClose: () => void;
  onCloseRefFocus: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (onCloseRefFocus) {
      closeRef.current?.focus({ preventScroll: true });
    }
  }, [onCloseRefFocus, title]);
  return (
    <header className="prof-side-header editor-head">
      <div className="prof-side-head-text">
        <div className="queue-kicker" data-testid="ca-prof-side-kicker">
          {readOnly ? "ТОЛЬКО ПРОСМОТР" : "РЕДАКТИРОВАНИЕ"}
        </div>
        <h2 id={titleId} data-testid="ca-prof-side-title">
          {title}
        </h2>
        {statusLabel ? (
          <div className="editor-status">
            <span className={`${statusClass} pill appeal-status`} data-testid="ca-prof-side-status">
              <span className="sr-only">Статус: </span>
              {statusLabel}
            </span>
          </div>
        ) : null}
        {subtitle ? (
          <p className="prof-side-subtitle" data-testid="ca-prof-side-subtitle">
            {subtitle}
          </p>
        ) : null}
      </div>
      <button
        ref={closeRef}
        type="button"
        className="btn secondary icon-button"
        aria-label="Закрыть"
        data-testid="ca-prof-side-close"
        onClick={onClose}
      >
        ×
      </button>
    </header>
  );
}

function CopyIconButton({
  caption,
  copied,
  withLabel = false,
  onCopy,
}: {
  caption: string;
  copied: boolean;
  withLabel?: boolean;
  onCopy: () => void;
}) {
  return (
    <>
      <button
        type="button"
        className={withLabel ? "btn ghost small-btn copy-btn" : "btn ghost icon copy-btn number-copy"}
        aria-label={`Скопировать: ${caption}`}
        title={`Скопировать: ${caption}`}
        onClick={onCopy}
      >
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path d="M5 15V6a2 2 0 0 1 2-2h9" />
        </svg>
        {withLabel ? (copied ? "Скопировано" : "Копировать") : null}
      </button>
      <span className="sr-only" role="status">
        {copied ? "Скопировано" : ""}
      </span>
    </>
  );
}

function RegistrationHelp({
  url,
  copied,
  onCopy,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="registration-help" data-testid="ca-prof-registration-help">
      <span className="muted small">Клиента нет в RemCard — пригласите по ссылке:</span>
      <div className="registration-link">
        <a href={url}>{url}</a>
        <button type="button" className="btn ghost small-btn" onClick={onCopy}>
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
    </div>
  );
}

function ProfSideActions({
  canSendOffer,
  sendBlockedReason,
  onSend,
}: {
  canSendOffer: boolean;
  sendBlockedReason?: string | null;
  onSend: () => void;
}) {
  const disabled = !canSendOffer;
  return (
    <div className="prof-side-actions">
      <button
        type="button"
        className="btn secondary"
        data-testid="ca-prof-send-offer"
        disabled={disabled}
        title={disabled ? sendBlockedReason ?? "Подготовка КП недоступна" : "Отправить коммерческое предложение"}
        onClick={onSend}
      >
        Отправить КП
      </button>
      {disabled && sendBlockedReason ? (
        <p className="muted small" data-testid="ca-prof-kp-blocked-hint">
          {sendBlockedReason}
        </p>
      ) : null}
    </div>
  );
}