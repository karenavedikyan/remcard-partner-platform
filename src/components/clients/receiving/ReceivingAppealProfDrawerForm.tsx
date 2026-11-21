"use client";

import { useCallback, useMemo, useState } from "react";
import type { ProfAppealDetailState, ProfAppealProfilePatchBody } from "@/lib/clients-parity/prof-appeals-adapter";
import {
  patchReceivingAppealProfileCas,
  receivingManualChannelOptions,
  type ReceivingPartnerSettings,
} from "@/lib/clients-parity/receiving-appeals-api";
import { ReceivingAppealTimeline } from "./ReceivingAppealTimeline";

export type ReceivingAppealProfDrawerFormProps = {
  detail: ProfAppealDetailState;
  settings?: ReceivingPartnerSettings | null;
  onDetailChange?: (next: ProfAppealDetailState) => void;
  onSaved?: () => void | Promise<void>;
};

type FormDraft = {
  appealTitle: string;
  clientDisplayName: string;
  requestText: string;
  clientCity: string;
  clientContact: string;
  budgetHint: string;
  privateNotes: string;
  erpDocumentNumber: string;
  manualSourceKey: string;
};

function draftFromDetail(detail: ProfAppealDetailState): FormDraft {
  const a = detail.appeal;
  return {
    appealTitle: a.appealTitle?.trim() ?? "",
    clientDisplayName: a.clientDisplayName?.trim() ?? a.clientName?.trim() ?? "",
    requestText: a.requestText?.trim() ?? "",
    clientCity: a.clientCity?.trim() ?? "",
    clientContact: a.clientContact?.trim() ?? "",
    budgetHint: a.budgetHint?.trim() ?? "",
    privateNotes: a.privateNotes?.trim() ?? "",
    erpDocumentNumber: a.erpDocumentNumber?.trim() ?? "",
    manualSourceKey: a.manualSourceKey?.trim() ?? "",
  };
}

export function ReceivingAppealProfDrawerForm({
  detail,
  settings,
  onDetailChange,
  onSaved,
}: ReceivingAppealProfDrawerFormProps) {
  const readOnly = detail.detailReadOnly;
  const [draft, setDraft] = useState(() => draftFromDetail(detail));
  const [revision, setRevision] = useState(detail.revision);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const channels = useMemo(() => receivingManualChannelOptions(settings), [settings]);

  const setField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveProfile = useCallback(async () => {
    if (readOnly || busy) return;
    setBusy(true);
    setError(null);
    const body: ProfAppealProfilePatchBody = {
      expectedRevision: revision,
      appealTitle: draft.appealTitle.trim() || null,
      clientDisplayName: draft.clientDisplayName.trim() || undefined,
      interest: draft.requestText.trim() || null,
      clientCity: draft.clientCity.trim() || null,
      clientContact: draft.clientContact.trim() || null,
      budgetHint: draft.budgetHint.trim() || null,
      privateNotes: draft.privateNotes.trim() || null,
      erpDocumentNumber: draft.erpDocumentNumber.trim() || null,
      manualSourceKey: draft.manualSourceKey.trim() || null,
    };
    const res = await patchReceivingAppealProfileCas(detail.appeal.id, body);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    const nextRevision = revision + 1;
    setRevision(nextRevision);
    setSaved(true);
    const patched: ProfAppealDetailState = {
      ...detail,
      revision: nextRevision,
      appeal: {
        ...detail.appeal,
        appealTitle: body.appealTitle ?? null,
        clientDisplayName: draft.clientDisplayName.trim() || detail.appeal.clientDisplayName,
        requestText: draft.requestText.trim() || null,
        clientCity: draft.clientCity.trim() || null,
        clientContact: draft.clientContact.trim() || null,
        budgetHint: draft.budgetHint.trim() || null,
        privateNotes: draft.privateNotes.trim() || null,
        erpDocumentNumber: draft.erpDocumentNumber.trim() || null,
        manualSourceKey: draft.manualSourceKey.trim() || null,
      },
    };
    onDetailChange?.(patched);
    await onSaved?.();
  }, [busy, detail, draft, onDetailChange, onSaved, readOnly, revision]);

  return (
    <div className="prof-drawer-form stack" data-testid="ca-prof-drawer-form">
      {readOnly ? (
        <p className="notice small" data-testid="ca-prof-drawer-readonly">
          Только просмотр: изменения профиля недоступны.
        </p>
      ) : null}
      <label className="field">
        Название обращения
        <input
          value={draft.appealTitle}
          readOnly={readOnly}
          data-testid="ca-prof-field-appealTitle"
          onChange={(e) => setField("appealTitle", e.target.value)}
        />
      </label>
      <label className="field">
        Клиент
        <input
          value={draft.clientDisplayName}
          readOnly={readOnly}
          data-testid="ca-prof-field-clientDisplayName"
          onChange={(e) => setField("clientDisplayName", e.target.value)}
        />
      </label>
      <label className="field">
        Запрос
        <textarea
          rows={3}
          value={draft.requestText}
          readOnly={readOnly}
          data-testid="ca-prof-field-requestText"
          onChange={(e) => setField("requestText", e.target.value)}
        />
      </label>
      <div className="row">
        <label className="field">
          Город
          <input value={draft.clientCity} readOnly={readOnly} onChange={(e) => setField("clientCity", e.target.value)} />
        </label>
        <label className="field">
          Контакт
          <input
            value={draft.clientContact}
            readOnly={readOnly}
            onChange={(e) => setField("clientContact", e.target.value)}
          />
        </label>
      </div>
      <label className="field">
        Бюджет
        <input value={draft.budgetHint} readOnly={readOnly} onChange={(e) => setField("budgetHint", e.target.value)} />
      </label>
      <label className="field">
        Номер в 1С
        <input
          value={draft.erpDocumentNumber}
          readOnly={readOnly}
          onChange={(e) => setField("erpDocumentNumber", e.target.value)}
        />
      </label>
      {channels.length > 0 ? (
        <label className="field">
          Источник
          <select
            value={draft.manualSourceKey || ""}
            disabled={readOnly}
            onChange={(e) => setField("manualSourceKey", e.target.value)}
          >
            <option value="">—</option>
            {channels.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="field">
        Служебные заметки
        <textarea
          rows={4}
          value={draft.privateNotes}
          readOnly={readOnly}
          data-testid="ca-prof-field-privateNotes"
          onChange={(e) => setField("privateNotes", e.target.value)}
        />
      </label>
      {detail.appeal.externalRefs.length > 0 ? (
        <section className="panel stack">
          <h3 className="small muted">Поля партнёра</h3>
          <ul className="stack">
            {detail.appeal.externalRefs.map((ref) => (
              <li key={ref.key}>
                <span className="muted small">{ref.label}</span>
                <div>{ref.value?.trim() || "—"}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {error ? (
        <p className="notice accent" role="alert">
          {error}
        </p>
      ) : null}
      {!readOnly ? (
        <div className="row">
          <button type="button" className="btn primary" disabled={busy} data-testid="ca-prof-save-profile" onClick={() => void saveProfile()}>
            {busy ? "Сохранение…" : saved ? "Сохранено" : "Сохранить"}
          </button>
        </div>
      ) : null}
      {detail.history.length > 0 ? (
        <section data-testid="ca-prof-appeal-history">
          <h3 className="small muted">История</h3>
          <ReceivingAppealTimeline entries={detail.history} />
        </section>
      ) : null}
    </div>
  );
}