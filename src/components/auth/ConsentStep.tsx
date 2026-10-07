"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ConsentRequirement } from "@/lib/cabinet-readiness";
import { consentLabel } from "@/lib/auth-consent";
import { consentRequirementKey } from "@/lib/auth-session";
import { getLegalSiteUrl } from "@/lib/auth-config";
import { Button } from "@/components/ui/Button";
import styles from "./auth.module.css";

type ConsentStepProps = {
  requirements: ConsentRequirement[];
  error: string;
  loading: boolean;
  onSubmit: (accepted: Set<string>) => void;
  onRetryReadiness: () => void;
};

function documentHref(base: string, req: ConsentRequirement): string {
  if (req.kind === "PERSONAL_DATA") return `${base}/privacy`;
  if (req.kind === "TERMS") return `${base}/terms`;
  if (req.kind === "PUBLIC_OFFER_PRO") return `${base}/legal/public-offer-pro`;
  return `${base}${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
}

function requirementsSignature(requirements: ConsentRequirement[]): string {
  return requirements.map(consentRequirementKey).join("|");
}

export function ConsentStep({
  requirements,
  error,
  loading,
  onSubmit,
  onRetryReadiness,
}: ConsentStepProps) {
  const legalBase = getLegalSiteUrl();
  const submitLock = useRef(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [localError, setLocalError] = useState("");
  const [signature, setSignature] = useState(requirementsSignature(requirements));

  useEffect(() => {
    const nextSignature = requirementsSignature(requirements);
    if (nextSignature !== signature) {
      setChecked({});
      setSignature(nextSignature);
    }
  }, [requirements, signature]);

  const hasMissingDocument = requirements.some((req) => !req.legalDocumentId);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitLock.current || loading) return;

    const accepted = new Set<string>();
    for (const req of requirements) {
      const key = consentRequirementKey(req);
      if (!req.legalDocumentId) {
        setLocalError("Документ временно недоступен. Повторите проверку.");
        return;
      }
      if (!checked[key]) {
        setLocalError("Примите все обязательные соглашения.");
        return;
      }
      accepted.add(key);
    }
    setLocalError("");

    submitLock.current = true;
    onSubmit(accepted);
    submitLock.current = false;
  }

  const allChecked =
    requirements.length > 0 &&
    requirements.every((req) => req.legalDocumentId && checked[consentRequirementKey(req)]);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="consent-title">
        <span className={styles.eyebrow}>RemCard PROF</span>
        <h1 id="consent-title" className={styles.title}>
          Обязательные соглашения
        </h1>
        <p className={styles.lead}>
          Примите документы, необходимые для работы в кабинете. Уже принятые актуальные версии
          повторно не запрашиваются.
        </p>

        {error || localError ? (
          <p className={styles.error} role="alert">
            {error || localError}
          </p>
        ) : null}

        {requirements.length === 0 ? (
          <>
            <p className={styles.lead}>Загружаем список соглашений…</p>
            <Button type="button" onClick={onRetryReadiness} disabled={loading}>
              {loading ? "Проверяем…" : "Повторить проверку"}
            </Button>
          </>
        ) : hasMissingDocument ? (
          <>
            <p className={styles.error} role="alert">
              Один из документов временно недоступен. Повторите проверку позже.
            </p>
            <Button type="button" onClick={onRetryReadiness} disabled={loading}>
              {loading ? "Проверяем…" : "Повторить проверку"}
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <fieldset className={styles.consentBlock} disabled={loading}>
              <legend className="sr-only">Обязательные согласия</legend>
              {requirements.map((req) => {
                const key = consentRequirementKey(req);
                return (
                  <label key={key} className={styles.consentRow}>
                    <input
                      type="checkbox"
                      checked={Boolean(checked[key])}
                      onChange={(event) =>
                        setChecked((prev) => ({ ...prev, [key]: event.target.checked }))
                      }
                    />
                    <span>
                      Я принимаю{" "}
                      <a
                        href={documentHref(legalBase, req)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {consentLabel(req.kind)}
                      </a>
                      {req.version ? ` (версия ${req.version})` : null}
                      {req.status === "stale" ? " — документ обновлён" : null}
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <Button type="submit" disabled={loading || !allChecked}>
              {loading ? "Сохраняем…" : "Продолжить"}
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}
