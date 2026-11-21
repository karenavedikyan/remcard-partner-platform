"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import {
  parseProfAppealDetailWire,
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
  onClose,
  onAppealMutated,
  partnerDisplayName = "Партнёр",
  partnerWorkPhones = [],
  offerOpen,
  onOfferOpenChange,
}: ReceivingAppealProfSidePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { copy, copiedKey } = useCopyDisplayedValue();
  const open = Boolean(appealId);
  const [detailPhase, setDetailPhase] = useState<DetailPhase>("loading");
  const [profDetail, setProfDetail] = useState<ProfAppealDetailState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commercialProposal, setCommercialProposal] = useState<CommercialProposalDeliveryWire | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

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

  if (!appealId) return null;

  const title = profDetail?.appeal.appealTitle || row?.appealTitle || row?.clientName || "Обращение";
  const prepareAllowed =
    commercialProposal?.prepareAllowed ?? profDetail?.appeal.commercialProposal.prepareAllowed ?? false;
  const canPrepareOffer = !readOnly && prepareAllowed;
  const hasCabinet = profDetail?.appeal.remCard.inCabinet ?? row?.remCard.inCabinet === true;
  const publicId =
    detailPhase === "prof" &&
    profDetail &&
    !profDetail.detailReadOnly &&
    profDetail.appeal.remCard.publicId?.trim()
      ? profDetail.appeal.remCard.publicId.trim()
      : null;
  const inviteUrl =
    profDetail?.appeal.remCard.inviteLoginUrl?.trim() || REMCARD_CLIENT_LOGIN_URL;

  return (
    <>
      <dialog
        ref={dialogRef}
        className={styles.profSidePanel}
        data-testid="ca-prof-side-panel"
        aria-labelledby={titleId}
        onClose={onClose}
      >
        <ProfSidePanelHeader id={titleId} title={title} onClose={onClose} />
        <div className="prof-side-body">
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
          <ProfSideActions
            canSendOffer={canPrepareOffer}
            sendBlockedReason={
              commercialProposal?.sendEnabled === false
                ? commercialProposal.sendDisabledReason
                : null
            }
            readOnly={readOnly}
            hasCabinet={hasCabinet}
            onSend={() => onOfferOpenChange(true)}
          />
          {detailPhase === "prof" && profDetail ? (
            <ReceivingAppealProfDrawerForm
              key={`${appealId}:${profDetail.revision}`}
              detail={profDetail}
              settings={settings}
              onDetailChange={setProfDetail}
              onSaved={onAppealMutated}
            />
          ) : detailPhase === "legacy" ? (
            <ReceivingAppealDetailHost
              appealId={appealId}
              readOnly={readOnly}
              readScope={readScope}
              onBack={onClose}
              onAppealMutated={onAppealMutated}
            />
          ) : null}
        </div>
      </dialog>
      {row && offerOpen ? (
        <ReceivingCommercialOfferDialog
          open={offerOpen}
          appeal={profDetail?.appeal ?? row}
          partnerDisplayName={partnerDisplayName}
          partnerWorkPhones={partnerWorkPhones}
          commercialProposal={commercialProposal ?? profDetail?.appeal.commercialProposal}
          onClose={() => onOfferOpenChange(false)}
        />
      ) : null}
    </>
  );
}

function ProfSidePanelHeader({
  id,
  title,
  onClose,
}: {
  id: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <header className="prof-side-header">
      <h2 id={id}>{title}</h2>
      <button type="button" className="btn ghost icon" aria-label="Закрыть" onClick={onClose}>
        ×
      </button>
    </header>
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