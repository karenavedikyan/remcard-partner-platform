"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  commercialProposalBlockedMessage,
  type CommercialProposalDeliveryWire,
  type ProfAppealListRow,
} from "@/lib/clients-parity/prof-appeals-adapter";
import styles from "./receiving.module.css";

export type ReceivingCommercialOfferDialogProps = {
  open: boolean;
  appeal: ProfAppealListRow;
  partnerDisplayName: string;
  partnerWorkPhones?: Array<{ id: string; label: string; number: string }>;
  partnerLogoUrl?: string | null;
  partnerType?: string | null;
  commercialProposal?: CommercialProposalDeliveryWire | null;
  onClose: () => void;
};

type OfferAttachment = { id: string; name: string; kind: "file" | "photo"; sizeBytes: number };

type OfferDraft = {
  offerTitle: string;
  message: string;
  price: string;
  schedule: string;
  validity: string;
  paymentTerms: string;
  nextStep: string;
  contactPhone: string;
  clientAction: string;
  designTemplate: "store" | "company";
  attachments: OfferAttachment[];
};

const INITIAL_DRAFT: OfferDraft = {
  offerTitle: "",
  message: "",
  price: "",
  schedule: "",
  validity: "",
  paymentTerms: "",
  nextStep: "",
  contactPhone: "",
  clientAction: "",
  designTemplate: "store",
  attachments: [],
};

const TEMPLATE_LABEL: Record<OfferDraft["designTemplate"], string> = {
  store: "Шаблон магазина",
  company: "Шаблон компании",
};

function computeOfferDraftSeed(appeal: ProfAppealListRow, partnerType: string | null | undefined): OfferDraft {
  return {
    ...INITIAL_DRAFT,
    offerTitle: appeal.appealTitle?.trim() || "",
    designTemplate: partnerType === "COMPANY" ? "company" : "store",
  };
}

function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}

export function ReceivingCommercialOfferDialog({
  open,
  appeal,
  partnerDisplayName,
  partnerWorkPhones = [],
  partnerLogoUrl = null,
  partnerType = null,
  commercialProposal,
  onClose,
}: ReceivingCommercialOfferDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null!);
  const photoInputRef = useRef<HTMLInputElement>(null!);
  const titleId = useId();
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [draft, setDraft] = useState<OfferDraft>(() => computeOfferDraftSeed(appeal, partnerType));
  const [sendNotice, setSendNotice] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep("compose");
      setDraft(computeOfferDraftSeed(appeal, partnerType));
      setSendNotice(null);
    }
  }, [open, partnerType, appeal.appealTitle]);

  const clientName = appeal.clientName?.trim() || "Клиент";
  const blockedMessage = commercialProposalBlockedMessage(commercialProposal);
  const sendBlocked = commercialProposal?.sendEnabled !== true;
  const stepLabel = step === "compose" ? "1 из 2 · Черновик" : "2 из 2 · Проверка";

  return (
    <dialog ref={dialogRef} className={styles.offerDialog} id="offer-dialog" aria-labelledby={titleId} onClose={onClose}>
      <form method="dialog" className="kp-form" onSubmit={(e) => e.preventDefault()}>
        <header className="kp-header">
          <div className="kp-header-main">
            <p className="kp-kicker">
              <span className="kp-step">{stepLabel}</span>
            </p>
            <h2 id={titleId}>{step === "compose" ? "Отправить КП" : "Как увидит клиент"}</h2>
            {step === "preview" ? (
              <p className="kp-header-lead muted small">
                Проверьте текст, условия и вложения перед отправкой.
              </p>
            ) : null}
          </div>
          <button type="button" className="btn ghost kp-close" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="kp-scroll">
          {step === "compose" ? (
            <>
              <div className="kp-route" aria-label="Маршрут предложения">
                <div className="kp-route-end">
                  <span className="kp-route-label">Отправитель</span>
                  <strong className="kp-route-name">{partnerDisplayName}</strong>
                </div>
                <span className="kp-route-arrow" aria-hidden="true">
                  →
                </span>
                <div className="kp-route-end">
                  <span className="kp-route-label">Клиент</span>
                  <strong className="kp-route-name">{clientName}</strong>
                </div>
              </div>
              <ComposeFields
                draft={draft}
                onChange={setDraft}
                partnerWorkPhones={partnerWorkPhones}
                fileInputRef={fileInputRef}
                photoInputRef={photoInputRef}
              />
            </>
          ) : (
            <div className="kp-partner-surface">
              <PreviewPane
                draft={draft}
                partnerDisplayName={partnerDisplayName}
                partnerLogoUrl={partnerLogoUrl}
                clientName={clientName}
                appeal={appeal}
              />
            </div>
          )}

          {sendNotice ? (
            <p className="notice accent" role="status" data-testid="ca-offer-send-notice">
              {sendNotice}
            </p>
          ) : null}
        </div>

        <footer className="kp-footer">
          {step === "preview" && sendBlocked && blockedMessage ? (
            <p className="kp-footer-note muted small" data-testid="ca-offer-footer-blocked">
              {blockedMessage}
            </p>
          ) : null}
          <div className="kp-footer-actions">
            {step === "preview" ? (
              <button type="button" className="btn ghost" onClick={() => setStep("compose")}>
                Назад
              </button>
            ) : (
              <button type="button" className="btn ghost" onClick={onClose}>
                Отмена
              </button>
            )}
            {step === "compose" ? (
              <button
                type="button"
                className="btn primary"
                data-testid="ca-offer-preview"
                onClick={() => setStep("preview")}
              >
                Предпросмотр
              </button>
            ) : (
              <button
                type="button"
                className="btn primary"
                data-testid="ca-offer-simulate-send"
                disabled={sendBlocked}
                title={sendBlocked ? blockedMessage || "Отправка недоступна" : undefined}
                onClick={() => {
                  if (sendBlocked) {
                    setSendNotice(blockedMessage || "Ничего не отправлено.");
                  }
                }}
              >
                Отправить
              </button>
            )}
          </div>
        </footer>
      </form>
    </dialog>
  );
}

function ComposeFields({
  draft,
  onChange,
  partnerWorkPhones,
  fileInputRef,
  photoInputRef,
}: {
  draft: OfferDraft;
  onChange: (d: OfferDraft) => void;
  partnerWorkPhones: Array<{ id: string; label: string; number: string }>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  photoInputRef: React.RefObject<HTMLInputElement>;
}) {
  const set = (patch: Partial<OfferDraft>) => onChange({ ...draft, ...patch });
  const attachFiles = (files: FileList | null, kind: "file" | "photo") => {
    if (!files?.length) return;
    const picked = Array.from(files).map((file) => ({
      id: `${kind}-${file.name}-${file.lastModified}`,
      name: file.name,
      kind,
      sizeBytes: file.size,
    }));
    onChange({ ...draft, attachments: [...draft.attachments, ...picked] });
  };
  return (
    <div className="kp-compose stack">
      <label className="field kp-field">
        <span className="kp-field-label">Название предложения</span>
        <input
          value={draft.offerTitle}
          onChange={(e) => set({ offerTitle: e.target.value })}
          data-testid="ca-offer-title"
          placeholder="Как клиент увидит заголовок КП"
        />
      </label>
      <label className="field kp-field">
        <span className="kp-field-label">Текст предложения</span>
        <textarea
          rows={4}
          value={draft.message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="Опишите предложение клиенту"
        />
      </label>

      <input
        ref={fileInputRef}
        id="ca-offer-file-input"
        type="file"
        className={styles.offerFileInput}
        data-testid="ca-offer-file-input"
        onChange={(e) => {
          attachFiles(e.target.files, "file");
          e.target.value = "";
        }}
      />
      <input
        ref={photoInputRef}
        id="ca-offer-photo-input"
        type="file"
        accept="image/*"
        className={styles.offerFileInput}
        data-testid="ca-offer-photo-input"
        onChange={(e) => {
          attachFiles(e.target.files, "photo");
          e.target.value = "";
        }}
      />
      <div className="kp-attach-row">
        <label htmlFor="ca-offer-file-input" className="btn ghost kp-attach-label" data-testid="ca-offer-attach-file">
          Прикрепить файл
        </label>
        <label htmlFor="ca-offer-photo-input" className="btn ghost kp-attach-label" data-testid="ca-offer-attach-photo">
          Добавить фото
        </label>
      </div>
      {draft.attachments.length > 0 ? (
        <ul className="kp-attachments">
          {draft.attachments.map((a) => (
            <li key={a.id} className="kp-attachment-item">
              <span className="kp-attachment-name">
                {a.name}
                {a.sizeBytes > 0 ? <span className="muted"> · {formatAttachmentSize(a.sizeBytes)}</span> : null}
              </span>
              <button
                type="button"
                className="btn ghost small-btn"
                onClick={() => set({ attachments: draft.attachments.filter((x) => x.id !== a.id) })}
              >
                Удалить
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="field kp-field">
        <span className="kp-field-label">Оформление</span>
        <select
          value={draft.designTemplate}
          data-testid="ca-offer-design-template"
          onChange={(e) => set({ designTemplate: e.target.value as OfferDraft["designTemplate"] })}
        >
          <option value="store">Магазин</option>
          <option value="company">Компания</option>
        </select>
      </label>

      <label className="field kp-field">
        <span className="kp-field-label">Сроки</span>
        <input value={draft.schedule} onChange={(e) => set({ schedule: e.target.value })} data-testid="ca-offer-schedule" />
      </label>

      <details className="kp-optional-terms">
        <summary>Дополнительные условия (необязательно)</summary>
        <div className="kp-optional-terms-body stack">
          <label className="field kp-field">
            <span className="kp-field-label">Цена</span>
            <input value={draft.price} onChange={(e) => set({ price: e.target.value })} />
          </label>
          <label className="field kp-field">
            <span className="kp-field-label">Срок действия</span>
            <input value={draft.validity} onChange={(e) => set({ validity: e.target.value })} data-testid="ca-offer-validity" />
          </label>
          <label className="field kp-field">
            <span className="kp-field-label">Условия оплаты</span>
            <input
              value={draft.paymentTerms}
              onChange={(e) => set({ paymentTerms: e.target.value })}
              data-testid="ca-offer-payment-terms"
            />
          </label>
        </div>
      </details>

      <section className="kp-next stack" aria-labelledby="kp-next-heading">
        <h3 id="kp-next-heading" className="kp-next-title">
          Что предлагает сделать партнёр
        </h3>
        <label className="field kp-field">
          <span className="kp-field-label">Инструкция для клиента</span>
          <textarea
            rows={2}
            value={draft.clientAction}
            onChange={(e) => set({ clientAction: e.target.value })}
            placeholder="Например: подтвердите смету или выберите время замера"
          />
        </label>
        <label className="field kp-field">
          <span className="kp-field-label">Телефон для связи</span>
          <select value={draft.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })}>
            <option value="">Не указывать телефон</option>
            {partnerWorkPhones.map((p) => (
              <option key={p.id} value={p.number}>
                {p.label}: {p.number}
              </option>
            ))}
          </select>
        </label>
      </section>
    </div>
  );
}

function PreviewPane({
  draft,
  partnerDisplayName,
  partnerLogoUrl,
  clientName,
  appeal,
}: {
  draft: OfferDraft;
  partnerDisplayName: string;
  partnerLogoUrl?: string | null;
  clientName: string;
  appeal: ProfAppealListRow;
}) {
  const templateClass = draft.designTemplate === "company" ? "offer-preview--company" : "offer-preview--store";
  const hasClientAction = draft.clientAction.trim().length > 0;
  const hasContactPhone = Boolean(draft.contactPhone);
  const previewOfferTitle = draft.offerTitle.trim() || appeal.appealTitle?.trim() || "Предложение";
  const partnerInitials = partnerDisplayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const recipientDate = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <div
      className={`client-shell offer-client-preview ${templateClass}`}
      data-testid="ca-offer-client-preview"
      data-design-template={draft.designTemplate}
    >
      <div className="kp-preview-brand">
        <div className="kp-preview-partner-row">
          {partnerLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partnerLogoUrl} alt="" className="offer-partner-logo" data-testid="ca-offer-partner-logo" />
          ) : (
            <span className="kp-preview-avatar" aria-hidden="true">
              {partnerInitials || partnerDisplayName.slice(0, 1)}
            </span>
          )}
          <p className="kp-preview-partner-label">
            Предложение от партнёра <strong>{partnerDisplayName}</strong>
          </p>
        </div>
        <div className="kp-remcard-badge" aria-label="RemCard">
          <span className="kp-remcard-mark">remcard</span>
          <span className="kp-remcard-tagline">Навигатор ремонта</span>
        </div>
        <h2 className="client-offer-title" data-testid="ca-offer-preview-title">
          {previewOfferTitle}
        </h2>
        <p className="kp-preview-recipient muted small">
          Получатель: {clientName} · {recipientDate}
        </p>
      </div>
      <div className="client-content">
        {draft.message.trim() ? (
          <>
            <p className="kp-preview-section-label">Что предлагаем</p>
            <p className="client-message">{draft.message}</p>
          </>
        ) : (
          <p className="muted">Без текста</p>
        )}
        {draft.price.trim() ? (
          <p className="client-offer-meta" data-testid="ca-offer-preview-price">
            <strong>Цена:</strong> {draft.price}
          </p>
        ) : null}
        {draft.schedule.trim() ? (
          <p className="client-offer-meta" data-testid="ca-offer-preview-schedule">
            <strong>Сроки:</strong> {draft.schedule}
          </p>
        ) : null}
        {draft.validity.trim() ? (
          <p className="client-offer-meta" data-testid="ca-offer-preview-validity">
            <strong>Срок действия:</strong> {draft.validity}
          </p>
        ) : null}
        {draft.paymentTerms.trim() ? (
          <p className="client-offer-meta" data-testid="ca-offer-preview-payment">
            <strong>Условия оплаты:</strong> {draft.paymentTerms}
          </p>
        ) : null}
        {draft.attachments.length > 0 ? (
          <>
            <p className="kp-preview-section-label">Вложения</p>
            <ul className="kp-preview-attachments">
              {draft.attachments.map((a) => (
                <li key={a.id}>
                  {a.name}
                  {a.sizeBytes > 0 ? <span className="muted"> · {formatAttachmentSize(a.sizeBytes)}</span> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {hasClientAction ? (
          <section className="client-offer-card kp-cta-card" data-testid="ca-offer-cta-action">
            <header>Что предлагает сделать партнёр</header>
            <p>{draft.clientAction.trim()}</p>
            {hasContactPhone ? (
              <p className="kp-cta-phone">
                <span className="muted">Телефон: </span>
                {draft.contactPhone}
              </p>
            ) : null}
          </section>
        ) : null}
        {hasContactPhone && !hasClientAction ? (
          <section className="client-offer-card kp-cta-card" data-testid="ca-offer-cta-contact">
            <header>Как связаться с партнёром</header>
            <p className="kp-cta-phone">{draft.contactPhone}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}