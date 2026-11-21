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
  commercialProposal?: CommercialProposalDeliveryWire | null;
  onClose: () => void;
};

type OfferDraft = {
  message: string;
  price: string;
  schedule: string;
  validity: string;
  paymentTerms: string;
  nextStep: string;
  contactPhone: string;
  clientAction: string;
  designTemplate: string;
  attachments: Array<{ id: string; name: string; kind: "file" | "photo" }>;
};

const INITIAL_DRAFT: OfferDraft = {
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

export function ReceivingCommercialOfferDialog({
  open,
  appeal,
  partnerDisplayName,
  partnerWorkPhones = [],
  commercialProposal,
  onClose,
}: ReceivingCommercialOfferDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [draft, setDraft] = useState<OfferDraft>(INITIAL_DRAFT);
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
      setDraft(INITIAL_DRAFT);
      setSendNotice(null);
    }
  }, [open]);

  const clientName = appeal.clientName?.trim() || "Клиент";
  const blockedMessage = commercialProposalBlockedMessage(commercialProposal);

  return (
    <dialog ref={dialogRef} className={styles.offerDialog} id="offer-dialog" aria-labelledby={titleId} onClose={onClose}>
      <form method="dialog" className="kp-form stack" onSubmit={(e) => e.preventDefault()}>
        <header className="kp-header row">
          <div>
            <div className="kp-kicker">
              <span className="kp-step">{step === "compose" ? "Шаг 1 — Черновик" : "Шаг 2 — Предпросмотр"}</span>
            </div>
            <h2 id={titleId}>Отправить КП</h2>
          </div>
          <button type="button" className="btn ghost kp-close" aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="kp-body stack">
          <div className="kp-route">
            <div>
              <span>Отправитель</span>
              <strong>{partnerDisplayName}</strong>
            </div>
            <span aria-hidden="true">→</span>
            <div>
              <span>Клиент</span>
              <strong>{clientName}</strong>
            </div>
          </div>

          {step === "compose" ? (
            <ComposeFields draft={draft} onChange={setDraft} partnerWorkPhones={partnerWorkPhones} />
          ) : (
            <PreviewPane draft={draft} partnerDisplayName={partnerDisplayName} clientName={clientName} appeal={appeal} />
          )}

          {sendNotice ? (
            <p className="notice accent" role="status" data-testid="ca-offer-send-notice">
              {sendNotice}
            </p>
          ) : null}
        </div>

        <footer className="kp-footer row">
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
              disabled={commercialProposal?.sendEnabled !== true}
              title={commercialProposal?.sendEnabled !== true ? blockedMessage || "Отправка недоступна" : undefined}
              onClick={() => {
                if (commercialProposal?.sendEnabled !== true) {
                  setSendNotice(blockedMessage || "Ничего не отправлено.");
                }
              }}
            >
              Отправить
            </button>
          )}
        </footer>
      </form>
    </dialog>
  );
}

function ComposeFields({
  draft,
  onChange,
  partnerWorkPhones,
}: {
  draft: OfferDraft;
  onChange: (d: OfferDraft) => void;
  partnerWorkPhones: Array<{ id: string; label: string; number: string }>;
}) {
  const set = (patch: Partial<OfferDraft>) => onChange({ ...draft, ...patch });
  const addAttachment = (kind: "file" | "photo") => {
    const id = `${kind}-${Date.now()}`;
    onChange({
      ...draft,
      attachments: [...draft.attachments, { id, name: kind === "file" ? "document.pdf" : "photo.jpg", kind }],
    });
  };
  return (
    <>
      <label className="field">
        Текст предложения
        <textarea
          rows={4}
          value={draft.message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="Опишите предложение клиенту"
        />
      </label>
      <div className="row">
        <button type="button" className="btn ghost" data-testid="ca-offer-attach-file" onClick={() => addAttachment("file")}>
          Прикрепить файл
        </button>
        <button type="button" className="btn ghost" data-testid="ca-offer-attach-photo" onClick={() => addAttachment("photo")}>
          Добавить фото
        </button>
      </div>
      {draft.attachments.length > 0 ? (
        <ul className="kp-attachments">
          {draft.attachments.map((a) => (
            <li key={a.id}>
              {a.name}{" "}
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
      <label className="field">
        Цена (необязательно)
        <input value={draft.price} onChange={(e) => set({ price: e.target.value })} />
      </label>
      <label className="field">
        Сроки
        <input value={draft.schedule} onChange={(e) => set({ schedule: e.target.value })} />
      </label>
      <label className="field">
        Срок действия
        <input value={draft.validity} onChange={(e) => set({ validity: e.target.value })} />
      </label>
      <label className="field">
        Условия оплаты
        <input value={draft.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value })} />
      </label>
      <label className="field">
        Что предложить клиенту сделать
        <textarea rows={2} value={draft.clientAction} onChange={(e) => set({ clientAction: e.target.value })} />
      </label>
      <label className="field">
        Телефон для связи (из сохранённых рабочих)
        <select value={draft.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })}>
          <option value="">Не указывать телефон</option>
          {partnerWorkPhones.map((p) => (
            <option key={p.id} value={p.number}>
              {p.label}: {p.number}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function PreviewPane({
  draft,
  partnerDisplayName,
  clientName,
  appeal,
}: {
  draft: OfferDraft;
  partnerDisplayName: string;
  clientName: string;
  appeal: ProfAppealListRow;
}) {
  return (
    <div className="client-shell offer-client-preview" data-testid="ca-offer-client-preview">
      <header className="client-who">
        <span className="avatar" aria-hidden="true">
          {partnerDisplayName.slice(0, 1)}
        </span>
        <div>
          <strong>{partnerDisplayName}</strong>
          <div>Коммерческое предложение</div>
        </div>
        <small className="client-eyebrow">Навигатор ремонта</small>
      </header>
      <div className="client-content">
        <h2>{appeal.appealTitle?.trim() || "Предложение"}</h2>
        {draft.message.trim() ? <p className="client-message">{draft.message}</p> : <p className="muted">Без текста</p>}
        {draft.attachments.map((a) => (
          <p key={a.id} className="muted small">
            Вложение: {a.name}
          </p>
        ))}
        {draft.clientAction.trim() ? (
          <section className="client-offer-card">
            <header>Что предлагает сделать партнёр</header>
            <p>{draft.clientAction}</p>
          </section>
        ) : null}
        {draft.contactPhone ? (
          <section className="client-offer-card">
            <header>Как связаться с партнёром</header>
            <p>{draft.contactPhone}</p>
          </section>
        ) : null}
        <p className="muted small">Клиент: {clientName}</p>
      </div>
    </div>
  );
}