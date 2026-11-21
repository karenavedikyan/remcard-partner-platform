"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  findDuplicateManualChannelLabel,
  postReceivingManualChannel,
  type ReceivingManualChannel,
  type ReceivingPartnerSettings,
} from "@/lib/clients-parity/receiving-appeals-api";
import styles from "./receiving.module.css";

export type ReceivingManualSourcesDialogProps = {
  open: boolean;
  settings: ReceivingPartnerSettings;
  settingsVersion?: string | number;
  readOnly?: boolean;
  onClose: () => void;
  onSettingsUpdated: (channels: ReceivingManualChannel[], version?: string | number) => void;
};

export function ReceivingManualSourcesDialog({
  open,
  settings,
  settingsVersion,
  readOnly = false,
  onClose,
  onSettingsUpdated,
}: ReceivingManualSourcesDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const channels = settings.manualChannels ?? [];

  const submit = async () => {
    if (readOnly) return;
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Введите название источника.");
      return;
    }
    if (findDuplicateManualChannelLabel(trimmed, channels)) {
      setError("Такой источник уже есть.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await postReceivingManualChannel(trimmed, settingsVersion);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setLabel("");
    onSettingsUpdated(res.snapshot.settings.manualChannels ?? [], res.snapshot.version);
  };

  return (
    <dialog ref={dialogRef} className={styles.sourcesDialog} aria-labelledby={titleId} onClose={onClose}>
      <form method="dialog" className="stack panel" onSubmit={(e) => e.preventDefault()}>
        <header className="row">
          <h2 id={titleId}>Источники</h2>
          <button type="button" className="btn ghost" onClick={onClose}>
            Закрыть
          </button>
        </header>
        <p className="muted small">Справочник ручных источников обращения. Автоматические источники только для чтения.</p>
        <ul id="source-settings-form" className="settings-list">
          {channels.map((c) => (
            <li key={c.key} className="settings-item row">
              <span>{c.label}</span>
            </li>
          ))}
          <li className="settings-item muted small">Направил партнёр (только чтение)</li>
        </ul>
        {readOnly ? (
          <p className="notice">Только просмотр справочника.</p>
        ) : (
          <div className="row">
            <label className="field" style={{ flex: 1 }}>
              Новый источник
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Выставка" />
            </label>
            <button type="button" className="btn primary" disabled={busy} onClick={() => void submit()}>
              Добавить
            </button>
          </div>
        )}
        {error ? (
          <p className="notice" role="alert">
            {error}
          </p>
        ) : (
          <p className="source-result" />
        )}
      </form>
    </dialog>
  );
}