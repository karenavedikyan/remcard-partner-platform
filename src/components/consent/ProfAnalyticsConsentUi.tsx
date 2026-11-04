"use client";

import { useEffect, useId, useState } from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import styles from "./ProfAnalyticsConsentUi.module.css";

const CHECKBOX_LABEL =
  "Разрешить учёт посещений кабинета для статистики сервиса";

const OPTIONAL_SCOPE_NOTE =
  "Необязательно. Сохраняется только в этом браузере, между устройствами не синхронизируется.";

const AGREEMENT_SCOPE_NOTE =
  "Сохраняется только в этом браузере, между устройствами не синхронизируется.";

function AnalyticsConsentCopy({ idPrefix }: { idPrefix: string }) {
  return (
    <p id={`${idPrefix}-desc`} className={styles.desc}>
      Учитываются входы в кабинет партнёра RemCard PROF для внутренней статистики сервиса. Это не
      маркетинговая рассылка. Выбор сохраняется в этом браузере и не синхронизируется между
      устройствами. Изменить можно в разделе «Профиль».
    </p>
  );
}

function AnalyticsConsentDetails({ idPrefix }: { idPrefix: string }) {
  return (
    <details className={styles.details}>
      <summary className={styles.detailsSummary}>Подробнее</summary>
      <AnalyticsConsentCopy idPrefix={idPrefix} />
    </details>
  );
}

function AnalyticsConsentProfileControls({
  draftEnabled,
  onDraftChange,
  onConfirm,
  statusNote,
  showSave,
}: {
  draftEnabled: boolean;
  onDraftChange: (next: boolean) => void;
  onConfirm: () => void;
  statusNote?: string | null;
  showSave: boolean;
}) {
  const checkboxId = useId();
  return (
    <div className={styles.profileControls}>
      <label className={styles.checkboxRow} htmlFor={checkboxId}>
        <input
          id={checkboxId}
          type="checkbox"
          className={styles.checkboxInput}
          checked={draftEnabled}
          onChange={(e) => onDraftChange(e.target.checked)}
        />
        <span className={styles.checkboxLabel}>{CHECKBOX_LABEL}</span>
      </label>
      <p className={styles.scopeNote}>{OPTIONAL_SCOPE_NOTE}</p>
      <AnalyticsConsentDetails idPrefix="prof-analytics-profile" />
      {statusNote ? (
        <p className={styles.statusNote} role="status">
          {statusNote}
        </p>
      ) : null}
      {showSave ? (
        <div className={styles.actions}>
          <button type="button" className={styles.secondarySave} onClick={onConfirm}>
            Сохранить
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Optional choice submitted together with the legal agreements, not a separate login panel. */
export function ProfAnalyticsConsentAgreementChoice({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  const checkboxId = useId();
  return (
    <div
      className={styles.agreementInset}
      data-testid="analytics-consent-agreements"
      aria-describedby="prof-analytics-agreement-scope"
    >
      <label className={styles.checkboxRow} htmlFor={checkboxId}>
        <input
          id={checkboxId}
          type="checkbox"
          className={styles.checkboxInput}
          checked={enabled}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className={styles.checkboxLabel}>
          {CHECKBOX_LABEL} (необязательно)
        </span>
      </label>
      <p id="prof-analytics-agreement-scope" className={styles.scopeNote}>
        {AGREEMENT_SCOPE_NOTE}
      </p>
      <AnalyticsConsentDetails idPrefix="prof-analytics-agreement" />
    </div>
  );
}

/** Profile setting for all partner types (incl. compact agent). */
export function ProfAnalyticsConsentProfileSetting() {
  const { state, needsDecision, confirmAnalyticsChoice } = useCookieConsent();
  const savedEnabled = state?.analytics;
  const baselineDraft = savedEnabled ?? true;
  const [draftEnabled, setDraftEnabled] = useState(baselineDraft);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraftEnabled(savedEnabled ?? true);
    setSavedFlash(false);
  }, [savedEnabled, state?.decidedAt]);

  const isDirty = draftEnabled !== baselineDraft;

  const statusNote = needsDecision
    ? "Решение ещё не сохранено в этом браузере."
    : savedEnabled
      ? "Учёт посещений включён."
      : "Учёт посещений выключен.";

  function save() {
    confirmAnalyticsChoice(draftEnabled);
    setSavedFlash(true);
  }

  return (
    <div className={styles.profileInset} data-testid="analytics-consent-profile">
      <AnalyticsConsentProfileControls
        draftEnabled={draftEnabled}
        onDraftChange={(next) => {
          setDraftEnabled(next);
          setSavedFlash(false);
        }}
        onConfirm={save}
        statusNote={statusNote}
        showSave={isDirty || needsDecision}
      />
      {savedFlash && !needsDecision && !isDirty ? (
        <p className={styles.savedOk} role="status">
          Настройка сохранена.
        </p>
      ) : null}
    </div>
  );
}
