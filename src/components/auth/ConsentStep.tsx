"use client";

import { FormEvent, useRef, useState } from "react";
import type { ConsentRequirement } from "@/lib/cabinet-readiness";
import { consentLabel } from "@/lib/auth-consent";
import { getLegalSiteUrl } from "@/lib/auth-config";
import { Button } from "@/components/ui/Button";
import styles from "./auth.module.css";

type ConsentStepProps = {
  requirements: ConsentRequirement[];
  error: string;
  loading: boolean;
  onSubmit: (accepted: Set<string>) => void;
};

function documentHref(base: string, req: ConsentRequirement): string {
  if (req.kind === "PERSONAL_DATA") return `${base}/privacy`;
  if (req.kind === "TERMS") return `${base}/terms`;
  if (req.kind === "PUBLIC_OFFER_PRO") return `${base}/legal/public-offer-pro`;
  return `${base}${req.url.startsWith("/") ? req.url : `/${req.url}`}`;
}

export function ConsentStep({ requirements, error, loading, onSubmit }: ConsentStepProps) {
  const legalBase = getLegalSiteUrl();
  const submitLock = useRef(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [localError, setLocalError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitLock.current || loading) return;

    const accepted = new Set<string>();
    for (const req of requirements) {
      if (!checked[req.kind]) {
        setLocalError("Примите все обязательные соглашения.");
        return;
      }
      accepted.add(req.kind);
    }
    setLocalError("");

    submitLock.current = true;
    onSubmit(accepted);
    submitLock.current = false;
  }

  const allChecked =
    requirements.length > 0 && requirements.every((req) => checked[req.kind]);

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
          <p className={styles.lead}>Проверяем статус…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <fieldset className={styles.consentBlock} disabled={loading}>
              <legend className="sr-only">Обязательные согласия</legend>
              {requirements.map((req) => (
                <label key={`${req.kind}-${req.legalDocumentId}`} className={styles.consentRow}>
                  <input
                    type="checkbox"
                    checked={Boolean(checked[req.kind])}
                    onChange={(event) =>
                      setChecked((prev) => ({ ...prev, [req.kind]: event.target.checked }))
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
              ))}
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
