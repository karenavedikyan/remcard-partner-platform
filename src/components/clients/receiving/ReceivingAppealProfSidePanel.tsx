"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ReceivingAppealProfDrawerFormHandle } from "./ReceivingAppealProfDrawerForm";
import {
  parseProfAppealDetailWire,
  profAppealRowSubtitle,
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
import { ReceivingAppealHistory } from "./ReceivingAppealHistory";
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
  const closeBtnRef = useRef<HTMLButtonElement>(null);
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
    if (!open) return;
    const t = window.setTimeout(() => {
      const writable = profDetail && !profDetail.detailReadOnly && !readOnly;
      if (writable) {
        titleInputRef.current?.focus({ preventScroll: true });
      } else {
        closeBtnRef.current?.focus({ preventScroll: true });
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, appealId, profDetail?.detailReadOnly, profDetail?.revision, readOnly]);

  useEffect(() => {
    setFormSaved(false);
  }, [appealId, profDetail?.revision]);

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
  const publicId =
    detailPhase === "prof" &&
    profDetail &&
    !profDetail.detailReadOnly &&
    profDetail.appeal.remCard.publicId?.trim()
      ? profDetail.appeal.remCard.publicId.trim()
      : null;
  const inviteUrl = profDetail?.appeal.remCard.inviteLoginUrl?.trim() || REMCARD_CLIENT_LOGIN_URL;
  const statusLabel = profDetail?.appeal.stageLabel ?? row?.stageLabel ?? "—";
  const branchEffective =
    profDetail?.appeal.receivingBranchLabel?.trim() ??
    row?.receivingBranchLabel?.trim() ??
    branchLabel?.trim() ??
    null;
  const subtitleLine = appealRow ? profAppealRowSubtitle(appealRow, branchEffective) : "—";
  const createdBy =
    profDetail?.appeal.createdByLabel?.trim() ?? row?.createdByLabel?.trim() ?? null;
  const certPromo = profDetail?.appeal.certificatePromoCode?.trim() ?? row?.certificatePromoCode?.trim() ?? null;
  const clientLine =
    profDetail?.appeal.clientDisplayName?.trim() ||
    row?.clientDisplayName?.trim() ||
    row?.clientName?.trim() ||
    "—";
  const contactLine = profDetail?.appeal.clientContact?.trim() || "—";

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
          <header className="prof-side-header prof-side-header--prototype">
            <div className="prof-side-header-main">
              <p className="prof-side-kicker" id={titleId}>
                <span className="prof-side-status" data-testid="ca-prof-side-status">
                  {statusLabel}
                </span>
              </p>
              {panelReadOnly ? (
                <h2 className="prof-side-title-readonly" data-testid="ca-prof-side-title-readonly">
                  {title}
                </h2>
              ) : null}
              <p className="prof-side-subtitle muted small" data-testid="ca-prof-side-subtitle">
                {subtitleLine}
              </p>
              {createdBy ? (
                <p className="prof-side-created-by muted small" data-testid="ca-prof-side-created-by">
                  Создал: {createdBy}
                </p>
              ) : null}
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              className="btn ghost icon"
              aria-label="Закрыть"
              data-testid="ca-prof-side-close"
              onClick={onClose}
            >
              ×
            </button>
          </header>
          <div className="prof-side-scroll">
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

            {publicId ? (
              <ClientIdPlate
                publicId={publicId}
                copied={copiedKey === "client-public-id"}
                onCopy={() => void copy("client-public-id", publicId)}
              />
            ) : detailPhase === "prof" && profDetail && !profDetail.appeal.remCard.inCabinet ? (
              <RegistrationHelp
                url={inviteUrl}
                copied={copiedKey === "registration"}
                onCopy={() => void copy("registration", inviteUrl)}
              />
            ) : null}

            {detailPhase === "prof" && appealRow ? (
              <div className="prof-info-boxes" data-testid="ca-prof-info-boxes">
                <section className="prof-info-box" data-testid="ca-prof-client-box">
                  <span className="muted small">Клиент</span>
                  <strong>{clientLine}</strong>
                  <span className="muted small">{contactLine}</span>
                </section>
                {certPromo ? (
                  <section className="prof-info-box" data-testid="ca-prof-certificate-box">
                    <span className="muted small">Сертификат</span>
                    <strong>{certPromo}</strong>
                  </section>
                ) : null}
              </div>
            ) : null}

            <ProfSideActions
              canSendOffer={canPrepareOffer}
              sendBlockedReason={
                commercialProposal?.sendEnabled === false ? commercialProposal.sendDisabledReason : null
              }
              readOnly={panelReadOnly}
              hasCabinet={hasCabinet}
              onSend={() => onOfferOpenChange(true)}
            />

            {detailPhase === "prof" && profDetail ? (
              <>
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
                {profDetail.history.length > 0 ? (
                  <details className="prof-side-history" data-testid="ca-prof-side-history">
                    <summary>История</summary>
                    <ReceivingAppealHistory
                      entries={profDetail.history}
                      projection="receiving-full"
                      refusedReason={profDetail.refusalReasons[0] ?? null}
                    />
                  </details>
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
          {detailPhase === "prof" && profDetail && !profDetail.detailReadOnly ? (
            <footer className="prof-drawer-footer" data-testid="ca-prof-drawer-footer">
              <button
                type="button"
                className="btn ghost"
                disabled={formBusy}
                onClick={() => formRef.current?.resetDraft()}
              >
                Отменить
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

function ClientIdPlate({
  publicId,
  copied,
  onCopy,
}: {
  publicId: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="client-id-plate" data-testid="ca-prof-client-id-plate">
      <div>
        <small>RemCard ID клиента</small>
        <strong>{publicId}</strong>
      </div>
      <button type="button" className="btn ghost small-btn" onClick={onCopy}>
        {copied ? "Скопировано" : "Копировать"}
      </button>
    </div>
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
    <details className="registration-help" open>
      <summary>Пригласить клиента</summary>
      <p>Ссылка для регистрации в RemCard — без раскрытия внутренних идентификаторов.</p>
      <div className="registration-link">
        <a href={url}>{url}</a>
        <button type="button" className="btn ghost small-btn" onClick={onCopy}>
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
    </details>
  );
}

function ProfSideActions({
  canSendOffer,
  sendBlockedReason,
  readOnly,
  hasCabinet,
  onSend,
}: {
  canSendOffer: boolean;
  sendBlockedReason?: string | null;
  readOnly: boolean;
  hasCabinet: boolean;
  onSend: () => void;
}) {
  if (readOnly) return null;
  if (!hasCabinet) return null;
  const disabled = !canSendOffer;
  return (
    <div className="prof-side-actions">
      <button
        type="button"
        className="btn primary"
        data-testid="ca-prof-send-offer"
        disabled={disabled}
        title={disabled ? sendBlockedReason ?? "Подготовка КП недоступна" : undefined}
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