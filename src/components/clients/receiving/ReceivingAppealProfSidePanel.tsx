"use client";

import { useEffect, useId, useRef, type RefObject } from "react";
import {
  REMCARD_CLIENT_LOGIN_URL,
  type CommercialProposalDeliveryWire,
  type ProfAppealListRow,
} from "@/lib/clients-parity/prof-appeals-adapter";
import type { ReceivingReadScope } from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealDetailHost } from "./ReceivingAppealDetailHost";
import { ReceivingCommercialOfferDialog } from "./ReceivingCommercialOfferDialog";
import { useCopyDisplayedValue } from "./useCopyDisplayedValue";
import styles from "./receiving.module.css";

export type ReceivingAppealProfSidePanelProps = {
  appealId: string | null;
  row: ProfAppealListRow | null;
  readOnly?: boolean;
  readScope?: ReceivingReadScope | null;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  onAppealMutated?: () => void | Promise<void>;
  partnerDisplayName?: string;
  offerOpen: boolean;
  onOfferOpenChange: (open: boolean) => void;
  commercialProposal?: CommercialProposalDeliveryWire | null;
  detailRemCardPublicId?: string | null;
  inviteLoginUrl?: string | null;
};

export function ReceivingAppealProfSidePanel({
  appealId,
  row,
  readOnly = false,
  readScope,
  onClose,
  onAppealMutated,
  partnerDisplayName = "Партнёр",
  offerOpen,
  onOfferOpenChange,
  commercialProposal,
  detailRemCardPublicId,
  inviteLoginUrl,
}: ReceivingAppealProfSidePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const { copy, copiedKey } = useCopyDisplayedValue();
  const open = Boolean(appealId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!appealId) return null;

  const canPrepareOffer =
    !readOnly && Boolean(commercialProposal?.prepareAllowed ?? row?.profCapabilities.canPrepareCommercialProposal);
  const publicId = detailRemCardPublicId?.trim() || null;
  const registrationUrl = inviteLoginUrl?.trim() || REMCARD_CLIENT_LOGIN_URL;

  return (
    <>
      <dialog
        ref={dialogRef}
        className={styles.profSidePanel}
        data-testid="ca-prof-side-panel"
        aria-labelledby={titleId}
        onClose={onClose}
      >
        <ProfSidePanelHeader id={titleId} title={row?.appealTitle || row?.clientName || "Обращение"} onClose={onClose} />
        <div className="prof-side-body">
          {publicId ? (
            <ClientIdPlate
              publicId={publicId}
              copied={copiedKey === "client-public-id"}
              onCopy={() => void copy("client-public-id", publicId)}
            />
          ) : (
            <RegistrationHelp
              url={registrationUrl}
              copied={copiedKey === "registration"}
              onCopy={() => void copy("registration", registrationUrl)}
            />
          )}
          <ProfSideActions
            canSendOffer={canPrepareOffer}
            readOnly={readOnly}
            hasCabinet={Boolean(row?.remCard.inCabinet)}
            onSend={() => onOfferOpenChange(true)}
          />
          <ReceivingAppealDetailHost
            appealId={appealId}
            readOnly={readOnly}
            readScope={readScope}
            onBack={onClose}
            onAppealMutated={onAppealMutated}
          />
        </div>
      </dialog>
      {row && offerOpen ? (
        <ReceivingCommercialOfferDialog
          open={offerOpen}
          appeal={row}
          partnerDisplayName={partnerDisplayName}
          commercialProposal={commercialProposal}
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
  readOnly,
  hasCabinet,
  onSend,
}: {
  canSendOffer: boolean;
  readOnly: boolean;
  hasCabinet: boolean;
  onSend: () => void;
}) {
  if (readOnly) return null;
  if (!hasCabinet) return null;
  return (
    <div className="prof-side-actions">
      <button
        type="button"
        className="btn primary"
        data-testid="ca-prof-send-offer"
        disabled={!canSendOffer}
        onClick={onSend}
      >
        Отправить КП
      </button>
    </div>
  );
}