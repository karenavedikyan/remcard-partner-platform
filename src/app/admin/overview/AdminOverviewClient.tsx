"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { fetchManagementOverview, type ManagementOverview } from "@/lib/prof-admin-management-api";
import styles from "./AdminOverview.module.css";

const PERIODS = [
  { id: "1d", label: "Сегодня" },
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
] as const;

export function AdminOverviewClient() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["id"]>("7d");
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
              <p className={styles.value}>{data.registrationsCompleted.days7.current}</p>
              <p className={styles.sub}>{data.registrationsCompleted.days7.comparisonNote ?? "За 7 дней (MSK)"}</p>
              <details>
                <summary>По типам за период</summary>
                <ul>
                  {Object.entries(data.registrationsCompleted.byKindInPeriod).map(([k, v]) => (
                    <li key={k}>{k}: {v}</li>
                  ))}
                </ul>
              </details>
            </article>
            <article className={styles.card}>
              <h2>Учтённые клиентские аккаунты</h2>
              <p className={styles.value}>{data.clients.accountedTotal}</p>
              <p className={styles.sub}>{data.clients.historicalDemoWarning}</p>
              <p className={styles.sub}>Новых за период: {data.clients.createdInPeriod.current}</p>
            </article>
            <article className={styles.card}>
              <h2>Активность PROF (партнёрские профили)</h2>
              <p className={styles.value}>{data.activity.profPartnerProfilesUsed.distinctInPeriod ?? "—"}</p>
              <p className={styles.sub}>{data.activity.profPartnerProfilesUsed.coverageNote}</p>
            </article>
            <article className={styles.card}>
              <h2>Видны в каталоге</h2>
              <p className={styles.value}>{data.partners.visibleInCatalog}</p>
              <p className={styles.sub}>Опубликованных карточек (user/org/branch): {data.partners.catalogCardSurfaces}</p>
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
              <h2>Просмотры публичных карточек</h2>
              <p className={styles.value}>{data.activity.publicPartnerCardViews.viewsInPeriod}</p>
              <p className={styles.sub}>{data.activity.publicPartnerCardViews.coverageNote}</p>
            </article>
          </div>
          <p className={styles.definitions}>{data.definitions.partnerProfile}</p>
        </>
      ) : null}
    </div>
  );
}
