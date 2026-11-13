"use client";

import { useState } from "react";
import {
  RECEIVING_MANUAL_CHANNEL_OPTIONS,
  type ReceivingAppealCreateBody,
} from "@/lib/clients-parity/receiving-appeals-api";
import styles from "./receiving.module.css";

/** Manual create — prototype renderManualInline / nav:manual. */
export type ReceivingAppealFormProps = {
  disabled?: boolean;
  persistBlockedMessage?: string;
  onSubmit: (body: ReceivingAppealCreateBody) => void | Promise<void>;
  onCancel?: () => void;
};

export function ReceivingAppealForm({
  disabled = false,
  persistBlockedMessage,
  onSubmit,
  onCancel,
}: ReceivingAppealFormProps) {
  const [clientName, setClientName] = useState("");
  const [interest, setInterest] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [manualChannel, setManualChannel] = useState<ReceivingAppealCreateBody["manualChannel"]>("phone");
  const [error, setError] = useState("");

  return (
    <section
      className={`panel stack ca-manual-form ${styles.receivingShell}`}
      data-testid="ca-receiving-appeal-form"
    >
      <form
        className="stack"
        id="ca-manual-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (disabled) {
            setError(persistBlockedMessage ?? "Создание недоступно до подключения API.");
            return;
          }
          const name = clientName.trim();
          if (!name) {
            setError("Укажите имя или компанию.");
            return;
          }
          void onSubmit({
            clientName: name,
            interest: interest.trim() || undefined,
            clientContact: clientContact.trim() || undefined,
            manualChannel,
          });
        }}
      >
        <label className="field ca-req">
          Имя или компания <span className="ca-req-mark" aria-hidden="true">*</span>
          <input
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <small className="input-hint">Как к вам обращаются в переписке или CRM.</small>
        </label>
        <label className="field">
          Запрос / интерес
          <input
            name="interest"
            maxLength={200}
            value={interest}
            placeholder="Что хотят купить или заказать"
            onChange={(e) => setInterest(e.target.value)}
          />
          <small className="input-hint">Попадёт в карточку и список обращений.</small>
        </label>
        <div className="ca-manual-grid">
          <label className="field">
            Контакт
            <input
              name="contact"
              maxLength={80}
              value={clientContact}
              placeholder="Телефон или @username"
              onChange={(e) => setClientContact(e.target.value)}
            />
            <small className="input-hint">Только для вашей команды.</small>
          </label>
          <label className="field">
            Канал
            <select
              name="source"
              value={manualChannel}
              onChange={(e) =>
                setManualChannel(e.target.value as ReceivingAppealCreateBody["manualChannel"])
              }
            >
              {RECEIVING_MANUAL_CHANNEL_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <small className="input-hint">Откуда пришёл клиент.</small>
          </label>
        </div>
        {error ? (
          <p className="field-error" id="ca-manual-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="ca-form-actions">
          {onCancel ? (
            <button type="button" className="btn ghost" data-ca-action="nav:list" onClick={onCancel}>
              Отмена
            </button>
          ) : null}
          <button type="submit" className="btn primary" disabled={disabled}>
            Создать обращение
          </button>
        </div>
      </form>
    </section>
  );
}
