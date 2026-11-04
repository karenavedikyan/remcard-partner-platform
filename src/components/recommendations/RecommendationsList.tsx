"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { certificateStatusLabel, certificateStatusTone } from "@/lib/certificate-labels";
import {
  certificateDisplayTitle,
  clientVisibleDiscountSummary,
} from "@/lib/certificate-url";
import type { CertificateListResponse, StoreCertificate } from "@/lib/certificate-types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CertificatesNewPartnerEmpty } from "@/components/certificates-new-partner-empty/CertificatesNewPartnerEmpty";
import styles from "./recommendations.module.css";
import { WelcomeContentAreaPending } from "@/components/welcome-first-paint/WelcomeContentAreaPending";
import { isRecommendationsWelcomeDecisionPending } from "@/lib/welcome-first-paint/welcomeFirstPaintPending";

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RecommendationsList() {
  const [items, setItems] = useState<StoreCertificate[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const data = await remcardFetch<CertificateListResponse>("/api/store/certificate");
      setItems(data.certificates ?? []);
      setLoadState("loaded");
    } catch (caught) {
      setLoadState("error");
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить рекомендации",
      );
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showNewPartnerEmpty = loadState === "loaded" && !error && items.length === 0;
  const welcomeDecisionPending = isRecommendationsWelcomeDecisionPending({
    loadState,
    itemsLength: items.length,
  });

  return (
    <>
      {!welcomeDecisionPending && !showNewPartnerEmpty ? (
      <div className={styles.pageActions}>
        <Link href="/recommendations/new">
          <Button>Создать рекомендацию</Button>
        </Link>
      </div>
      ) : null}

      {welcomeDecisionPending ? (
        <WelcomeContentAreaPending testId="recommendations-welcome-decision-pending" />
      ) : null}

      {!welcomeDecisionPending && loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{error}</p>
          <Button variant="secondary" onClick={() => void load()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {!welcomeDecisionPending && showNewPartnerEmpty ? (
        <CertificatesNewPartnerEmpty role="specialist" createHref="/recommendations/new" />
      ) : null}

      {!welcomeDecisionPending && loadState === "loaded" && items.length === 0 && !showNewPartnerEmpty ? (
        <div className={styles.empty}>
          <p>Пока нет созданных рекомендаций.</p>
          <Link href="/recommendations/new">
            <Button>Создать первую</Button>
          </Link>
        </div>
      ) : null}

      {!welcomeDecisionPending && loadState === "loaded" && items.length > 0 ? (
        <div className={styles.list}>
          {items.map((cert) => (
            <article key={cert.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{certificateDisplayTitle(cert)}</h2>
                  <p className={styles.meta}>
                    {formatDate(cert.createdAt)} · код {cert.promoCode} · скидка{" "}
                    {clientVisibleDiscountSummary(cert)}
                  </p>
                </div>
                <StatusBadge
                  label={certificateStatusLabel(cert.status)}
                  tone={certificateStatusTone(cert.status)}
                />
              </div>
              <div className={styles.cardActions}>
                <Link href={`/recommendations/${cert.id}`}>
                  <Button variant="secondary">Открыть</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </>
  );
}
