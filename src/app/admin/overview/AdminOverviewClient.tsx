"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
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

type SeriesRow = { date: string; [k: string]: number | string };

/** Local single-series line chart geometry — presentation only; does not alter source order/values. */
function buildLineGeometry(values: number[], width: number, height: number) {
  const n = values.length;
  const padL = 42;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const max = Math.max(4, ...values) + 2;
  const xAt = (i: number) =>
    n <= 1 ? padL + (width - padL - padR) / 2 : padL + (i * (width - padL - padR)) / (n - 1);
  const yAt = (v: number) => height - padB - (v / max) * (height - padT - padB);
  const linePath =
    n === 0
      ? ""
      : values.map((v, i) => `${i ? "L" : "M"}${xAt(i)},${yAt(v)}`).join(" ");
  const areaPath =
    n === 0
      ? ""
      : `${linePath} L${xAt(n - 1)},${height - padB} L${xAt(0)},${height - padB} Z`;
  const guides = [0, 1, 2, 3].map((i) => {
    const v = Math.round((i * max) / 3);
    return { v, y: yAt(v) };
  });
  const axisIdx =
    n <= 1
      ? [0]
      : n <= 3
        ? values.map((_, i) => i)
        : [0, Math.floor((n - 1) / 3), Math.floor(((n - 1) * 2) / 3), n - 1];
  return { max, xAt, yAt, linePath, areaPath, guides, axisIdx, padL, width, height };
}

function MiniBars({
  title,
  series,
  valueKey,
  emptyLabel,
}: {
  title: string;
  series: SeriesRow[];
  valueKey: string;
  emptyLabel: string;
}) {
  const gradId = `ov-area-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const svgW = 650;
  const svgH = 204;
  const plotted = useMemo(() => {
    const values = series.map((row) => Number(row[valueKey] ?? 0));
    return { values, geo: buildLineGeometry(values, svgW, svgH) };
  }, [series, valueKey]);

  if (series.length === 0) {
    return (
      <div className={styles.chartBlock}>
        <div className={styles.chartHead}>
          <h3>{title}</h3>
        </div>
        <div className={styles.chartWrap}>
          <p className={styles.chartEmpty}>{emptyLabel}</p>
        </div>
      </div>
    );
  }

  const { values, geo } = plotted;

  return (
    <div className={styles.chartBlock}>
      <div className={styles.chartHead}>
        <h3>{title}</h3>
      </div>
      <div className={styles.chartWrap}>
        <svg
          className={styles.lineChart}
          viewBox={`0 0 ${svgW} ${svgH}`}
          role="img"
          aria-label={`${title}: ${values.length} точек`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {geo.guides.map((g, gi) => (
            <g key={`g-${gi}`}>
              <line
                x1={geo.padL}
                y1={g.y}
                x2={svgW - 8}
                y2={g.y}
                className={styles.chartGuide}
              />
              <text x={28} y={g.y + 4} textAnchor="end" className={styles.chartAxisText}>
                {g.v}
              </text>
            </g>
          ))}
          <path d={geo.areaPath} fill={`url(#${gradId})`} />
          <path
            d={geo.linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {values.map((v, i) => (
            <circle
              key={series[i].date}
              cx={geo.xAt(i)}
              cy={geo.yAt(v)}
              r="4"
              className={styles.chartDot}
            >
              <title>
                {series[i].date}: {v}
              </title>
            </circle>
          ))}
          {geo.axisIdx.map((i) => (
            <text
              key={`ax-${series[i].date}`}
              x={geo.xAt(i)}
              y={svgH - 2}
              textAnchor={i === 0 ? "start" : i === values.length - 1 ? "end" : "middle"}
              className={styles.chartAxisText}
            >
              {String(series[i].date).slice(5)}
            </text>
          ))}
        </svg>
      </div>
      <ul className={styles.chartBars} aria-label={title}>
        {series.map((row) => {
          const v = Number(row[valueKey] ?? 0);
          return (
            <li key={row.date}>
              <span className={styles.chartDate}>{row.date}</span>
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
          <div className={styles.kpis}>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Партнёры с новой регистрацией</h2>
              <p className={styles.kpiValue}>{data.partners.liveRegistered}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>Демо-база (историческая): {data.partners.demoRegistered}</p>
                <Link href="/admin/partners?registration=active">Открыть реестр</Link>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Завершённые регистрации</h2>
              <p className={styles.kpiValue}>{regCard.value}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>{regCard.note}</p>
                <ul className={styles.kindList}>
                  {regKindRows.map((row) => (
                    <li key={row.label}>
                      {row.label}: {row.value}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Учтённые клиентские аккаунты</h2>
              <p className={styles.kpiValue}>{data.clients.accountedTotal}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>{data.clients.historicalDemoWarning}</p>
                <p className={styles.sub}>Новых за период: {data.clients.createdInPeriod.current}</p>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Активность PROF (партнёрские профили)</h2>
              <p className={styles.kpiValue}>
                {data.activity.profPartnerProfilesUsed.distinctInPeriod ?? "—"}
              </p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>{data.activity.profPartnerProfilesUsed.coverageNote}</p>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Видны в каталоге</h2>
              <p className={styles.kpiValue}>{data.partners.visibleInCatalog}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>
                  Опубликованных карточек (user/org/branch): {data.partners.catalogCardSurfaces}
                </p>
                <Link href="/admin/partners">Реестр партнёров</Link>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Требуют модерации</h2>
              <p className={styles.kpiValue}>{data.moderation.pendingPartners}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>
                  Старейшая заявка:{" "}
                  {data.moderation.oldestPendingPartnerAt
                    ? new Date(data.moderation.oldestPendingPartnerAt).toLocaleString("ru-RU")
                    : "—"}
                </p>
                <Link href="/admin/moderation">Очередь модерации</Link>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Заявки и лиды</h2>
              <p className={styles.kpiValue}>{data.leadsAndRequests.leadsNew}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>Открытых лидов: {data.leadsAndRequests.leadsOpen}</p>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Публичный remcard.ru (партнёры)</h2>
              <p className={styles.kpiValue}>—</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>{data.activity.publicSiteAuthenticatedPartners.coverageNote}</p>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Просмотры публичных карточек</h2>
              <p className={styles.kpiValue}>{data.activity.publicPartnerCardViews.viewsInPeriod}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>{data.activity.publicPartnerCardViews.coverageNote}</p>
              </div>
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
