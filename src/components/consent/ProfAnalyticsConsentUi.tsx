"use client";

import { useCookieConsent } from "@/contexts/CookieConsentContext";
import styles from "./ProfAnalyticsConsentUi.module.css";

export function ProfAnalyticsConsentBanner() {
  const { needsDecision, acceptAnalytics, rejectAnalytics } = useCookieConsent();

  if (!needsDecision) return null;

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-labelledby="prof-analytics-consent-title"
      aria-describedby="prof-analytics-consent-desc"
    >
      <div className={styles.bannerInner}>
        <div>
          <h2 id="prof-analytics-consent-title" className={styles.title}>
            Аналитика кабинета
          </h2>
          <p id="prof-analytics-consent-desc" className={styles.desc}>
            Можно разрешить анонимный учёт посещений кабинета партнёра для управленческих
            показателей. Это не обязательно для работы кабинета и не включается автоматически.
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={rejectAnalytics}>
            Не сейчас
          </button>
          <button type="button" className={styles.primary} onClick={acceptAnalytics}>
            Разрешить аналитику
          </button>
        </div>
      </div>
    </div>
  );
}

/** Change analytics choice after the initial banner (account footer control). */
export function ProfAnalyticsConsentManage() {
  const { state, needsDecision, setAnalyticsEnabled } = useCookieConsent();

  if (needsDecision || !state) return null;

  return (
    <div className={styles.manage} data-testid="analytics-consent-manage">
      <span className={styles.manageLabel}>
        Аналитика кабинета: {state.analytics ? "включена" : "выключена"}
      </span>
      <button
        type="button"
        className={styles.manageBtn}
        onClick={() => setAnalyticsEnabled(!state.analytics)}
      >
        {state.analytics ? "Отключить" : "Включить"}
      </button>
    </div>
  );
}
