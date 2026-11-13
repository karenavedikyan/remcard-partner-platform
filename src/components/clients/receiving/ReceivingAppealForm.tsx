"use client";

import { useMemo, useRef, useState } from "react";
import {
  findDuplicateManualChannelLabel,
  postReceivingManualChannel,
  receivingManualChannelOptions,
  type ReceivingAppealCreateBody,
  type ReceivingPartnerSettings,
  type ReceivingPartnerSettingsSnapshot,
} from "@/lib/clients-parity/receiving-appeals-api";
import styles from "./receiving.module.css";

const ADD_CHANNEL_KEY = "__add_channel__";

/** Manual create — prototype renderManualInline (frozen): name, interest, contact, channel. */
export type ReceivingAppealFormProps = {
  disabled?: boolean;
  persistBlockedMessage?: string;
  settings?: ReceivingPartnerSettings;
  settingsVersion?: string | number;
  onChannelsUpdated?: (snapshot: ReceivingPartnerSettingsSnapshot) => void;
  onSubmit: (body: ReceivingAppealCreateBody) => void | Promise<void>;
  onCancel?: () => void;
};

export function ReceivingAppealForm({
  disabled = false,
  persistBlockedMessage,
  settings,
  settingsVersion,
  onChannelsUpdated,
  onSubmit,
  onCancel,
}: ReceivingAppealFormProps) {
  const channelOptions = useMemo(() => receivingManualChannelOptions(settings), [settings]);
  const defaultChannelKey = channelOptions[0]?.key ?? "phone";

  const [clientName, setClientName] = useState("");
  const [interest, setInterest] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [channelSelect, setChannelSelect] = useState<string>(defaultChannelKey);
  const [customChannelLabel, setCustomChannelLabel] = useState("");
  const [customChannelError, setCustomChannelError] = useState("");
  const [channelSavePending, setChannelSavePending] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitPending = useRef(false);

  const showAddChannel = channelSelect === ADD_CHANNEL_KEY;

  const cancelAddChannel = () => {
    setCustomChannelLabel("");
    setCustomChannelError("");
    setChannelSelect(defaultChannelKey);
  };

  const addCustomChannel = async () => {
    setCustomChannelError("");
    const trimmed = customChannelLabel.trim();
    if (!trimmed) {
      setCustomChannelError("Введите название канала.");
      return;
    }
    const duplicate = findDuplicateManualChannelLabel(trimmed, channelOptions);
    if (duplicate) {
      setCustomChannelError("Такой канал уже есть.");
      return;
    }
    if (disabled) {
      setCustomChannelError(persistBlockedMessage ?? "Сохранение канала недоступно.");
      return;
    }
    setChannelSavePending(true);
    const res = await postReceivingManualChannel(trimmed, settingsVersion);
    setChannelSavePending(false);
    if (!res.ok) {
      setCustomChannelError(res.message);
      return;
    }
    onChannelsUpdated?.(res.snapshot);
    setCustomChannelLabel("");
    setChannelSelect(res.channel.key);
  };

  return (
    <section
      className={`panel stack ca-manual-form ca-section ${styles.receivingShell}`}
      data-testid="ca-receiving-appeal-form"
    >
      <form
        className="stack"
        id="ca-manual-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (submitPending.current) return;
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
          if (channelSelect === ADD_CHANNEL_KEY) {
            setError("Добавьте канал или выберите из списка.");
            return;
          }
          const known = channelOptions.some((c) => c.key === channelSelect);
          if (!known) {
            setError("Выберите канал из списка.");
            return;
          }
          setError("");
          submitPending.current = true;
          setSubmitting(true);
          void (async () => {
            try {
              await onSubmit({
                clientName: name,
                interest: interest.trim() || undefined,
                clientContact: clientContact.trim() || undefined,
                manualSourceKey: channelSelect,
              });
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Не удалось создать обращение.");
            } finally {
              submitPending.current = false;
              setSubmitting(false);
            }
          })();
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
          </label>
          <label className="field">
            Канал
            <select
              name="source"
              value={channelSelect}
              onChange={(e) => {
                const next = e.target.value;
                setChannelSelect(next);
                if (next !== ADD_CHANNEL_KEY) {
                  setCustomChannelLabel("");
                  setCustomChannelError("");
                }
              }}
            >
              {channelOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
              <option value={ADD_CHANNEL_KEY}>+ Свой канал</option>
            </select>
          </label>
        </div>
        {showAddChannel ? (
          <div className="stack" data-testid="ca-manual-add-channel">
            <label className="field">
              Название своего канала
              <input
                name="customChannel"
                maxLength={80}
                value={customChannelLabel}
                placeholder="Например: Яндекс.Директ"
                disabled={channelSavePending}
                onChange={(e) => {
                  setCustomChannelLabel(e.target.value);
                  setCustomChannelError("");
                }}
              />
            </label>
            {customChannelError ? (
              <p className="field-error" id="ca-manual-channel-error" role="alert">
                {customChannelError}
              </p>
            ) : null}
            <div className="ca-form-actions">
              <button
                type="button"
                className="btn ghost"
                disabled={channelSavePending}
                onClick={cancelAddChannel}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={disabled || channelSavePending}
                data-testid="ca-manual-add-channel-submit"
                onClick={() => void addCustomChannel()}
              >
                {channelSavePending ? "Сохранение…" : "Добавить канал"}
              </button>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="field-error" id="ca-manual-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="ca-form-actions">
          {onCancel ? (
            <button type="button" className="btn ghost" data-ca-action="nav:list" onClick={onCancel} disabled={submitting}>
              Отмена
            </button>
          ) : null}
          <button type="submit" className="btn primary" disabled={disabled || showAddChannel || submitting}>
            Создать обращение
          </button>
        </div>
      </form>
    </section>
  );
}
