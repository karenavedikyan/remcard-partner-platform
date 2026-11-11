"use client";

import { FormEvent, useId, useState } from "react";
import { consentLabel } from "@/lib/auth-consent";
import { getLegalSiteUrl } from "@/lib/auth-config";
import {
  REGISTRATION_PRE_AUTH_CONSENT_KINDS,
  preAuthDocumentHref,
  type RegistrationPreAuthConsentKind,
} from "@/lib/registration/pre-auth-consent";
import type { RegistrationKind } from "@/lib/registration/types";
import { ProfAnalyticsConsentAgreementChoice } from "@/components/consent/ProfAnalyticsConsentUi";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { Button } from "@/components/ui/Button";
import authStyles from "@/components/auth/auth.module.css";

type Props = {
  kind: RegistrationKind;
  onContinue: () => void;
  onBack: () => void;
};

export function RegistrationPreAuthConsent({ kind, onContinue, onBack }: Props) {
  const legalBase = getLegalSiteUrl();
  const titleId = useId();
  const { state, confirmAnalyticsChoice } = useCookieConsent();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(state?.analytics ?? true);
  const [checked, setChecked] = useState<Record<RegistrationPreAuthConsentKind, boolean>>({
    PERSONAL_DATA: false,
    TERMS: false,
    PUBLIC_OFFER_PRO: false,
  });
  const [error, setError] = useState("");

  const allRequired = REGISTRATION_PRE_AUTH_CONSENT_KINDS.every((key) => checked[key]);

  function toggle(key: RegistrationPreAuthConsentKind) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
    setError("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!allRequired) {
      setError("Отметьте все обязательные соглашения, чтобы запросить код входа.");
      return;
    }
    confirmAnalyticsChoice(analyticsEnabled);
    onContinue();
  }

  return (
    <section className={authStyles.card} aria-labelledby={titleId} data-testid="registration-pre-auth-consent">
      <span className={authStyles.eyebrow}>RemCard PROF</span>
      <h2 id={titleId} className={authStyles.title}>
        Соглашения перед входом
      </h2>
      <p className={authStyles.lead}>
        Ознакомьтесь с документами до запроса кода в MAX или Telegram. Это подтверждение хранится
        только в этой вкладке и не заменяет принятие актуальных версий после подтверждения личности.
      </p>

      {error ? (
        <p className={authStyles.error} role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className={authStyles.consentBlock}>
          <legend className="sr-only">Обязательные согласия перед входом</legend>
          {REGISTRATION_PRE_AUTH_CONSENT_KINDS.map((key) => {
            const inputId = `pre-auth-${kind}-${key}`;
            const href = preAuthDocumentHref(legalBase, key);
            return (
              <label key={key} className={authStyles.consentRow} htmlFor={inputId}>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked[key]}
                  onChange={() => toggle(key)}
                />
                <span>
                  Я принимаю{" "}
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {consentLabel(key)}
                  </a>
                </span>
              </label>
            );
          })}

          <ProfAnalyticsConsentAgreementChoice
            enabled={analyticsEnabled}
            onChange={setAnalyticsEnabled}
          />
        </fieldset>

        <div className={authStyles.actions}>
          <Button type="submit" disabled={!allRequired}>
            Продолжить к MAX / Telegram
          </Button>
          <Button type="button" variant="secondary" onClick={onBack}>
            Назад
          </Button>
        </div>
      </form>
    </section>
  );
}
