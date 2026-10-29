"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  fetchPartnerCertificateProgram,
  type PartnerCertProgramState,
} from "@/lib/partner-certificate-program";
import { buildVitrineCard } from "@/lib/partners-prototype-v1/vitrine-card";
import type { PartnerSearchResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import styles from "./PartnerVitrineDetails.module.css";

type Props = {
  partner: PartnerSearchResult;
  onClose: () => void;
  onInvite: (partner: PartnerSearchResult) => void;
};

export function PartnerVitrineDetails({ partner, onClose, onInvite }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const card = buildVitrineCard(partner);
  const [terms, setTerms] = useState<PartnerCertProgramState>({ status: "loading" });

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setTerms({ status: "loading" });
    const fromSearch = partner.publishedTerms;
    if (Array.isArray(fromSearch)) {
      if (fromSearch.length === 0) {
        setTerms({ status: "empty" });
      } else {
        setTerms({
          status: "loaded",
          items: fromSearch.map((row) => ({
            category: row.category,
            categoryLabel: row.categoryLabel || row.category,
            poolPercent: row.poolPercent,
          })),
        });
      }
      return;
    }
    void fetchPartnerCertificateProgram(partner.id).then((next) => {
      if (!cancelled) setTerms(next);
    });
    return () => {
      cancelled = true;
    };
  }, [partner]);

  return (
    <div className={styles.backdrop} role="presentation" data-testid="partner-vitrine-details">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{card.kindLabel}</p>
            <h3 id={titleId}>{card.title}</h3>
            <p className={styles.sub}>{card.city}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeBtn}
            aria-label="Закрыть"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <p className={styles.body}>{card.specializationLine}</p>
        {card.stagesLine ? <p className={styles.sub}>{card.stagesLine}</p> : null}
        {card.description ? <p className={styles.body}>{card.description}</p> : null}

        <details className={styles.terms} open>
          <summary>Опубликованные условия</summary>
          {terms.status === "loading" ? <p className={styles.sub}>Загрузка…</p> : null}
          {terms.status === "error" ? (
            <p className={styles.error} role="alert">
              {terms.message}
            </p>
          ) : null}
          {terms.status === "empty" ? (
            <p className={styles.sub}>
              Общие условия пока не опубликованы. Можно запросить персональное предложение.
            </p>
          ) : null}
          {terms.status === "loaded" ? (
            <>
              <ul>
                {terms.items.map((item) => (
                  <li key={item.category}>
                    <span>{item.categoryLabel}</span>
                    <strong>{item.poolPercent}%</strong>
                  </li>
                ))}
              </ul>
              <p className={styles.sub}>
                Общий процент: скидка клиенту + бонус агенту. Не гарантированный доход.
              </p>
            </>
          ) : null}
        </details>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onClose}>
            К витрине
          </Button>
          <Button
            type="button"
            onClick={() => {
              onInvite(partner);
              onClose();
            }}
          >
            Пригласить
          </Button>
        </div>
      </div>
    </div>
  );
}
