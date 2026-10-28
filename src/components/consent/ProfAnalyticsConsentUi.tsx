"use client";

import { useEffect, useId, useState } from "react";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import styles from "./ProfAnalyticsConsentUi.module.css";

const CHECKBOX_LABEL =
  "Разрешить учёт посещений кабинета для статистики сервиса";

function AnalyticsConsentCopy({ idPrefix }: { idPrefix: string }) {
  return (
    <p id={`${idPrefix}-desc`} className={styles.desc}>
      Учитываются входы в кабинет партнёра RemCard PROF для внутренней статистики сервиса. Это не
      маркетинговая рассылка. Выбор сохраняется в этом браузере и не синхронизируется между
      устройствами. Изменить можно в разделе «Профиль».
    </p>
  );
}

function AnalyticsConsentControls({
  draftEnabled,
  onDraftChange,
  onConfirm,
  confirmLabel,
  statusNote,
}: {
  draftEnabled: boolean;
  onDraftChange: (next: boolean) => void;
  onConfirm: () => void;
  confirmLabel: string;
  statusNote?: string | null;
}) {
  const checkboxId = useId();
  return (
    <>
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
      {statusNote ? (
        <p className={styles.statusNote} role="status">
          {statusNote}
        </p>
      ) : null}
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </>
  );
}

/** Compact choice on partner login; no fixed overlay. */
export function ProfAnalyticsConsentLoginBlock() {
  const { needsDecision, confirmAnalyticsChoice } = useCookieConsent();
  const [draftEnabled, setDraftEnabled] = useState(true);

  useEffect(() => {
    if (needsDecision) setDraftEnabled(true);
  }, [needsDecision]);

  if (!needsDecision) return null;

  return (
    <section
      className={styles.loginBlock}
      aria-labelledby="prof-analytics-login-title"
      aria-describedby="prof-analytics-login-desc"
      data-testid="analytics-consent-login"
    >
      <h2 id="prof-analytics-login-title" className={styles.title}>
        Аналитика кабинета
      </h2>
      <AnalyticsConsentCopy idPrefix="prof-analytics-login" />
      <AnalyticsConsentControls
        draftEnabled={draftEnabled}
        onDraftChange={setDraftEnabled}
        onConfirm={() => confirmAnalyticsChoice(draftEnabled)}
        confirmLabel="Подтвердить выбор"
      />
    </section>
  );
}

/** Profile setting for all partner types (incl. compact agent). */
export function ProfAnalyticsConsentProfileSetting() {
  const { state, needsDecision, confirmAnalyticsChoice } = useCookieConsent();
  const savedEnabled = state?.analytics;
  const [draftEnabled, setDraftEnabled] = useState(savedEnabled ?? true);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setDraftEnabled(savedEnabled ?? true);
  }, [savedEnabled, state?.decidedAt]);

  const statusNote = needsDecision
    ? "Решение ещё не сохранено в этом браузере."
    : state?.analytics
      ? "Учёт посещений включён."
      : "Учёт посещений выключен.";

  function save() {
    confirmAnalyticsChoice(draftEnabled);
    setSavedFlash(true);
  }

  return (
    <section
      className={styles.profileBlock}
      aria-labelledby="prof-analytics-profile-title"
      data-testid="analytics-consent-profile"
    >
      <h2 id="prof-analytics-profile-title" className={styles.title}>
        Аналитика кабинета
      </h2>
      <AnalyticsConsentCopy idPrefix="prof-analytics-profile" />
      <AnalyticsConsentControls
        draftEnabled={draftEnabled}
        onDraftChange={(next) => {
          setDraftEnabled(next);
          setSavedFlash(false);
        }}
        onConfirm={save}
        confirmLabel="Сохранить настройку"
        statusNote={statusNote}
      />
      {savedFlash && !needsDecision ? (
        <p className={styles.savedOk} role="status">
          Настройка сохранена.
        </p>
      ) : null}
    </section>
  );
}
