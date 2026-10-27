"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PARTNER_KIND_UI_LABELS } from "@/lib/partner-kind-ui";
import { fetchManagementOverview, type ManagementOverview } from "@/lib/prof-admin-management-api";
import styles from "./AdminOverview.module.css";

const PERIODS = [
  { id: "1d", label: "Сегодня" },
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

function kindLabel(key: string): string {
  if (key in PARTNER_KIND_UI_LABELS) {
    return PARTNER_KIND_UI_LABELS[key as keyof typeof PARTNER_KIND_UI_LABELS];
  }
  return key;
}

function MiniBars({
  title,
  series,
  valueKey,
  emptyLabel,
}: {
  title: string;
  series: { date: string; [k: string]: number | string }[];
  valueKey: string;
  emptyLabel: string;
}) {
  const max = Math.max(1, ...series.map((row) => Number(row[valueKey] ?? 0)));
  if (series.length === 0) {
    return (
      <div className={styles.chartBlock}>
        <h3>{title}</h3>
        <p className={styles.chartEmpty}>{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className={styles.chartBlock}>
      <h3>{title}</h3>
      <ul className={styles.chartBars} aria-label={title}>
        {series.map((row) => {
          const v = Number(row[valueKey] ?? 0);
          return (
            <li key={row.date}>
              <span className={styles.chartDate}>{row.date.slice(5)}</span>
              <span className={styles.chartTrack} aria-hidden>
                <span className={styles.chartFill} style={{ width: `${(v / max) * 100}%` }} />
              </span>
              <span className={styles.chartVal}>{v}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AdminOverviewClient() {
  const [period, setPeriod] = useState<PeriodId>("7d");
  const [data, setData] = useState<ManagementOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchManagementOverview(period));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить обзор");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const regCard = useMemo(() => {
    if (!data) return { value: "—", note: "" };
    const block = data.registrationsCompleted;
    const sel = block.selectedPeriod ?? block.days7;
    return {
      value: String(sel.current),
      note: block.selectedPeriodLabel ?? sel.comparisonNote ?? "",
    };
  }, [data]);

  const regKindRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.registrationsCompleted.byKindInPeriod).map(([k, v]) => ({
      label: kindLabel(k),
      value: v,
    }));
  }, [data]);

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1>Обзор</h1>
          <p className={styles.meta}>
            {data ? (
              <>
                Обновлено {new Date(data.generatedAt).toLocaleString("ru-RU", { timeZone: data.timezone })}{" "}
                ({data.timezone})
              </>
            ) : (
              "Загрузка…"
            )}
          </p>
        </div>
        <div className={styles.periods} role="group" aria-label="Период">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={period === p.id ? styles.periodActive : styles.period}
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {loading && !data ? <p role="status">Загрузка показателей…</p> : null}
      {data ? (
        <>
          <div className={styles.grid}>
            <article className={styles.card}>
              <h2>Партнёры с новой регистрацией</h2>
              <p className={styles.value}>{data.partners.liveRegistered}</p>
              <p className={styles.sub}>Демо-база (историческая): {data.partners.demoRegistered}</p>
              <Link href="/admin/partners?registration=active">Открыть реестр</Link>
            </article>
            <article className={styles.card}>
              <h2>Завершённые регистрации</h2>
              <p className={styles.value}>{regCard.value}</p>
              <p className={styles.sub}>{regCard.note}</p>
              <ul className={styles.kindList}>
                {regKindRows.map((row) => (
                  <li key={row.label}>
                    {row.label}: {row.value}
                  </li>
                ))}
              </ul>
            </article>
            <article className={styles.card}>
              <h2>Учтённые клиентские аккаунты</h2>
              <p className={styles.value}>{data.clients.accountedTotal}</p>
              <p className={styles.sub}>{data.clients.historicalDemoWarning}</p>
              <p className={styles.sub}>Новых за период: {data.clients.createdInPeriod.current}</p>
            </article>
            <article className={styles.card}>
              <h2>Активность PROF (партнёрские профили)</h2>
              <p className={styles.value}>
                {data.activity.profPartnerProfilesUsed.distinctInPeriod ?? "—"}
              </p>
              <p className={styles.sub}>{data.activity.profPartnerProfilesUsed.coverageNote}</p>
            </article>
            <article className={styles.card}>
              <h2>Видны в каталоге</h2>
              <p className={styles.value}>{data.partners.visibleInCatalog}</p>
              <p className={styles.sub}>
                Опубликованных карточек (user/org/branch): {data.partners.catalogCardSurfaces}
              </p>
              <Link href="/admin/partners">Реестр партнёров</Link>
            </article>
            <article className={styles.card}>
              <h2>Требуют модерации</h2>
              <p className={styles.value}>{data.moderation.pendingPartners}</p>
              <p className={styles.sub}>
                Старейшая заявка:{" "}
                {data.moderation.oldestPendingPartnerAt
                  ? new Date(data.moderation.oldestPendingPartnerAt).toLocaleString("ru-RU")
                  : "—"}
              </p>
              <Link href="/admin/moderation">Очередь модерации</Link>
            </article>
            <article className={styles.card}>
              <h2>Заявки и лиды</h2>
              <p className={styles.value}>{data.leadsAndRequests.leadsNew}</p>
              <p className={styles.sub}>Открытых лидов: {data.leadsAndRequests.leadsOpen}</p>
            </article>
            <article className={styles.card}>
              <h2>Публичный remcard.ru (партнёры)</h2>
              <p className={styles.value}>—</p>
              <p className={styles.sub}>{data.activity.publicSiteAuthenticatedPartners.coverageNote}</p>
            </article>
            <article className={styles.card}>
              <h2>Просмотры публичных карточек</h2>
              <p className={styles.value}>{data.activity.publicPartnerCardViews.viewsInPeriod}</p>
              <p className={styles.sub}>{data.activity.publicPartnerCardViews.coverageNote}</p>
            </article>
          </div>
          <div className={styles.chartsRow}>
            <MiniBars
              title="Регистрации по дням"
              series={data.registrationsCompleted.seriesDaily}
              valueKey="total"
              emptyLabel="Нет завершённых регистраций в выбранном периоде"
            />
            <MiniBars
              title="Активные профили PROF по дням"
              series={data.activitySeriesDaily ?? []}
              valueKey="profPartnerProfiles"
              emptyLabel="Нет данных — учёт начнётся после первых визитов кабинета"
            />
          </div>
          <p className={styles.definitions}>{data.definitions.partnerProfile}</p>
        </>
      ) : null}
    </div>
  );
}
