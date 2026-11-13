"use client";

import { FormEvent, useId, useMemo, useState } from "react";
import { consentLabel } from "@/lib/auth-consent";
import { getLegalSiteUrl } from "@/lib/auth-config";
import {
  REGISTRATION_PRE_AUTH_CONSENT_KINDS,
  createPreAuthAttemptId,
  preAuthDocumentHref,
  savePreAuthConsentSnapshot,
  type RegistrationPreAuthConsentKind,
} from "@/lib/registration/pre-auth-consent";
import { preAuthConsentsUnavailableMessage } from "@/lib/registration/pre-auth-consents-capability";
import type { PreAuthConsentsCapability, RegistrationKind } from "@/lib/registration/types";
import { ProfAnalyticsConsentAgreementChoice } from "@/components/consent/ProfAnalyticsConsentUi";
import { useCookieConsent } from "@/contexts/CookieConsentContext";
import { Button } from "@/components/ui/Button";
import authStyles from "@/components/auth/auth.module.css";

type Props = {
  kind: RegistrationKind;
  preAuthConsents: PreAuthConsentsCapability | null | undefined;
  onContinue: () => void;
};

export function RegistrationPreAuthConsent({ kind, preAuthConsents, onContinue }: Props) {
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

  const requirements = useMemo(() => {
    if (!preAuthConsents?.available) return [];
    return preAuthConsents.requirements;
  }, [preAuthConsents]);

  const documentsBlocked = !preAuthConsents?.available || requirements.length === 0;
  const unavailableMessage = preAuthConsentsUnavailableMessage(preAuthConsents);

  const allRequired = REGISTRATION_PRE_AUTH_CONSENT_KINDS.every((key) => checked[key]);

  function toggle(key: RegistrationPreAuthConsentKind) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
    setError("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (documentsBlocked) {
      setError(unavailableMessage);
      return;
    }
    if (!allRequired) {
      setError("Отметьте все обязательные соглашения, чтобы запросить код входа.");
      return;
    }
    const attemptId = createPreAuthAttemptId();
    const saved = savePreAuthConsentSnapshot(kind, requirements, attemptId);
    if (!saved) {
      setError(
        "Не удалось сохранить подтверждение в браузере. Разрешите хранение данных для вкладки и повторите.",
      );
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
        Ознакомьтесь с актуальными версиями документов до запроса кода в MAX или Telegram. После
        подтверждения личности мы сохраним принятие тех же версий в аккаунте без повторных галочек,
        если документы не изменились.
      </p>

      {documentsBlocked ? (
        <p className={authStyles.error} role="alert">
          {unavailableMessage}
        </p>
      ) : null}

      {error ? (
        <p className={authStyles.error} role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} noValidate>
        <fieldset className={authStyles.consentBlock} disabled={documentsBlocked}>
          <legend className="sr-only">Обязательные согласия перед входом</legend>
          {requirements.map((req) => {
            const inputId = `pre-auth-${kind}-${req.kind}`;
            const href = preAuthDocumentHref(legalBase, req.kind, req);
            return (
              <label key={req.kind} className={authStyles.consentRow} htmlFor={inputId}>
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked[req.kind]}
                  onChange={() => toggle(req.kind)}
                  disabled={documentsBlocked}
                />
                <span>
                  Я принимаю{" "}
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {consentLabel(req.kind)}
                  </a>
                  {req.version ? <> (версия {req.version})</> : null}
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
          <Button type="submit" disabled={!allRequired || documentsBlocked}>
            Продолжить к MAX / Telegram
          </Button>
        </div>
      </form>
    </section>
  );
}
