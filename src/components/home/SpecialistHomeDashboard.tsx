"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { CertificateListResponse } from "@/lib/certificate-types";
import type { WalletBalanceResponse } from "@/lib/history-types";
import { formatMoneyRub } from "@/lib/history-format";
import {
  initialSpecialistHomeMetrics,
  specialistHomeCertificateMetric,
  specialistHomeMetricsFromWallet,
  type SpecialistHomeMetricSlice,
  type SpecialistHomeMetrics,
  type SpecialistHomeMoneySlice,
} from "@/lib/specialist-home/metrics";
import { Button } from "@/components/ui/Button";
import { IconChevronRight } from "@/components/layout/ThemeIcons";
import styles from "./SpecialistHomeDashboard.module.css";

type SpecialistHomeDashboardProps = {
  needsProfileCompletion?: boolean;
  catalogStatus?: string | null;
};

const QUICK_LINKS = [
  {
    href: "/partners",
    title: "Партнёры",
    subtitle: "Условия сотрудничества",
  },
  {
    href: "/recommendations",
    title: "Сертификаты",
    subtitle: "Только относящиеся к вам данные",
  },
  {
    href: "/settlements",
    title: "Бонусы",
    subtitle: "Только относящиеся к вам данные",
  },
] as const;

function metricCountLabel(slice: SpecialistHomeMetricSlice): string {
  if (slice.state === "loading") return "…";
  if (slice.state === "error") return "—";
  if (slice.state === "empty") return "0";
  return String(slice.value);
}

function moneyLabel(slice: SpecialistHomeMoneySlice): string {
  if (slice.state === "loading") return "…";
  if (slice.state === "error") return "—";
  if (slice.state === "empty") return formatMoneyRub(0);
  return formatMoneyRub(slice.rub);
}

export function SpecialistHomeDashboard({
  needsProfileCompletion,
  catalogStatus,
}: SpecialistHomeDashboardProps) {
  const [metrics, setMetrics] = useState<SpecialistHomeMetrics>(initialSpecialistHomeMetrics);
  const [loadState, setLoadState] = useState<"loading" | "loaded">("loading");

  const loadMetrics = useCallback(async () => {
    setLoadState("loading");
    setMetrics(initialSpecialistHomeMetrics);

    let wallet: WalletBalanceResponse | null = null;
    let walletError: string | null = null;
    let certs: CertificateListResponse | null = null;
    let certError: string | null = null;

    await Promise.all([
      remcardFetch<WalletBalanceResponse>("/api/pro/wallet/balance")
        .then((data) => {
          wallet = data;
        })
        .catch((caught) => {
          walletError =
            caught instanceof RemcardApiError
              ? caught.message
              : "Не удалось загрузить начисления";
        }),
      remcardFetch<CertificateListResponse>("/api/store/certificate")
        .then((data) => {
          certs = data;
        })
        .catch((caught) => {
          certError =
            caught instanceof RemcardApiError
              ? caught.message
              : "Не удалось загрузить сертификаты";
        }),
    ]);

    const walletMetrics = specialistHomeMetricsFromWallet(wallet, walletError);
    setMetrics({
      certificates: specialistHomeCertificateMetric(certs, certError),
      ...walletMetrics,
    });
    setLoadState("loaded");
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const metricsFailed =
    loadState === "loaded" &&
    (metrics.certificates.state === "error" ||
      metrics.accrued.state === "error" ||
      metrics.received.state === "error");

  return (
    <div className={styles.grid}>
      {catalogStatus === "NEEDS_REVISION" ? (
        <section className={styles.alertBanner} role="status">
          <strong>Нужно исправить профиль</strong>
          <p>Есть замечания модератора — откройте профиль, внесите правки и отправьте повторно.</p>
          <Link href="/profile?section=moderation">Исправить профиль →</Link>
        </section>
      ) : needsProfileCompletion ? (
        <section className={styles.alertBanner} role="status">
          <strong>Дополните профиль</strong>
          <p>Укажите имя представителя, город и направления работы, чтобы отправить карточку на проверку.</p>
          <Link href="/profile">Заполнить профиль →</Link>
        </section>
      ) : null}

      <section className={styles.heroTask} aria-labelledby="specialist-home-hero">
        <div>
          <h2 id="specialist-home-hero">Рекомендуйте проверенного партнёра</h2>
          <p className={styles.heroLead}>
            Помогите заказчику выбрать товары или услуги для его проекта.
          </p>
        </div>
        <Link href="/recommendations/new" className={styles.primaryCta}>
          <Button>Создать сертификат</Button>
        </Link>
      </section>

      <div className={styles.stats} aria-live="polite">
        <div className={styles.stat}>
          <span className={styles.statLabel}>Сертификаты</span>
          <strong className={styles.statValue}>{metricCountLabel(metrics.certificates)}</strong>
          {metrics.certificates.state === "error" ? (
            <p className={styles.statError} role="alert">
              {metrics.certificates.message}
            </p>
          ) : null}
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Начислено</span>
          <strong className={styles.statValue}>{moneyLabel(metrics.accrued)}</strong>
          {metrics.accrued.state === "error" ? (
            <p className={styles.statError} role="alert">
              {metrics.accrued.message}
            </p>
          ) : null}
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Получено</span>
          <strong className={styles.statValue}>{moneyLabel(metrics.received)}</strong>
          {metrics.received.state === "error" ? (
            <p className={styles.statError} role="alert">
              {metrics.received.message}
            </p>
          ) : null}
        </div>
      </div>

      {metricsFailed ? (
        <div className={styles.retryRow}>
          <Button variant="secondary" onClick={() => void loadMetrics()}>
            Обновить показатели
          </Button>
        </div>
      ) : null}

      <div className={styles.twoCol}>
        <section className={styles.panel}>
          <h2>С чего начать</h2>
          {QUICK_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.actionLine}>
              <div>
                <h3>{item.title}</h3>
                <small>{item.subtitle}</small>
              </div>
              <span className={styles.iconBtn} aria-hidden="true">
                <IconChevronRight />
              </span>
            </Link>
          ))}
        </section>

        <section className={styles.panel}>
          <h2>Ничего лишнего на старте</h2>
          <p className={styles.deferredCopy}>
            Публикация в каталоге, дополнительные программы и подробное описание доступны позже.
            Начните с одного нужного действия.
          </p>
          <div className={styles.divider} />
          <Link href="/profile">
            <Button variant="secondary">Настроить профиль</Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
