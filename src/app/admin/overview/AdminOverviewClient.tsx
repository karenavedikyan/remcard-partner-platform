"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PARTNER_KIND_UI_LABELS } from "@/lib/partner-kind-ui";
import { fetchManagementOverview, type ManagementOverview } from "@/lib/prof-admin-management-api";
import {
  fetchAdminAnalyticsOverview,
  type AdminAnalyticsRegistrationsByDay,
  type AdminAnalyticsOverviewResponse,
} from "@/lib/prof-admin-overview-analytics-api";
import { getAdminClientTotal } from "@/lib/prof-admin-clients-api";
import { buildLineGeometry } from "./overviewLineChartGeometry";
import {
  OVERVIEW_ATTENTION_MODERATION_PARTNERS_HREF,
  OVERVIEW_PARTNERS_ACTIVE_REGISTRY_HREF,
} from "./overviewAttentionNavigation";
import {
  formatOverviewChartAxisLabel,
  formatOverviewChartFullDay,
} from "./overviewChartDates";
import { overviewPartnerRegistrationNote } from "./overviewCopy";
import styles from "./AdminOverview.module.css";

const PERIODS = [
  { id: "1d", label: "Сегодня" },
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

function periodButtonLabel(id: PeriodId): string {
  return PERIODS.find((p) => p.id === id)?.label ?? id;
}

function periodIdFromApi(value: string | undefined, fallback: PeriodId): PeriodId {
  if (value === "1d" || value === "7d" || value === "30d") return value;
  return fallback;
}

function kindLabel(key: string): string {
  if (key in PARTNER_KIND_UI_LABELS) {
    return PARTNER_KIND_UI_LABELS[key as keyof typeof PARTNER_KIND_UI_LABELS];
  }
  return key;
}


/** User-unit chart height; matches CSS height via meet without shrinking text when width tracks. */
const CHART_VIEW_H = 204;

function periodScopePhrase(id: PeriodId): string {
  if (id === "1d") return "сегодня";
  if (id === "7d") return "7 дней";
  return "30 дней";
}

function CommunityGrowthPanel({
  subtitle,
  series,
  emptyLabel,
  loading,
  error,
  onRetry,
}: {
  subtitle: string;
  series: AdminAnalyticsRegistrationsByDay[] | undefined;
  emptyLabel: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const gradId = `ov-area-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [plotW, setPlotW] = useState(320);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const cs = getComputedStyle(el);
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const w = Math.floor(el.clientWidth - padX);
      if (w > 0) setPlotW(w);
    };
    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = series ?? [];
  const clients = rows.map((r) => r.clients);
  const pros = rows.map((r) => r.pros);
  const scaleValues = rows.map((r) => Math.max(r.clients, r.pros, 0));
  const geo = useMemo(
    () => buildLineGeometry(scaleValues, plotW, CHART_VIEW_H),
    [scaleValues, plotW],
  );

  const showChart = rows.length > 0;
  const labelX = Math.max(4, geo.padL - 6);

  return (
    <section
      className={styles.chartBlock}
      data-source="admin-analytics-overview"
      aria-label="Рост сообщества"
    >
      <div className={styles.chartHead}>
        <div className={styles.chartHeadCopy}>
          <h2 className={styles.panelTitle}>Рост сообщества</h2>
          <p className={styles.chartSubtitle}>{subtitle}</p>
        </div>
        <span className={styles.chartSubtitle} aria-disabled="true">
          Аналитика готовится
        </span>
      </div>
      {error ? (
        <div className={styles.chartSourceError}>
          <p role="alert">{error}</p>
          <button type="button" className={styles.retryButton} onClick={onRetry}>
            Повторить
          </button>
        </div>
      ) : null}
      {loading && !showChart ? (
        <p className={styles.chartEmpty} role="status">
          Загрузка ряда…
        </p>
      ) : null}
      {!loading && !error && !showChart ? (
        <div className={styles.chartWrap} ref={wrapRef}>
          <p className={styles.chartEmpty}>{emptyLabel}</p>
        </div>
      ) : null}
      {showChart ? (
        <>
          {loading ? (
            <p className={styles.chartsLoading} role="status">
              Обновление ряда…
            </p>
          ) : null}
          <div className={styles.chartWrap} ref={wrapRef}>
            <svg
              className={styles.lineChart}
              viewBox={`0 0 ${plotW} ${CHART_VIEW_H}`}
              width={plotW}
              role="img"
              aria-label={`Рост сообщества: ${rows.length} точек`}
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
                    x2={plotW - 8}
                    y2={g.y}
                    className={styles.chartGuide}
                  />
                  <text x={labelX} y={g.y + 4} textAnchor="end" className={styles.chartAxisText}>
                    {g.label}
                  </text>
                </g>
              ))}
              <path
                d={
                  clients.length === 0
                    ? ""
                    : clients
                        .map((v, i) => `${i ? "L" : "M"}${geo.xAt(i)},${geo.yAt(v)}`)
                        .join(" ")
                }
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={
                  pros.length === 0
                    ? ""
                    : pros.map((v, i) => `${i ? "L" : "M"}${geo.xAt(i)},${geo.yAt(v)}`).join(" ")
                }
                fill="none"
                className={styles.chartLineSecondary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {clients.map((v, i) => (
                <circle
                  key={`c-${rows[i].date}`}
                  cx={geo.xAt(i)}
                  cy={geo.yAt(v)}
                  r="4"
                  className={styles.chartDot}
                >
                  <title>
                    {formatOverviewChartFullDay(rows[i].date)}: клиенты {v}, PRO {pros[i]}
                  </title>
                </circle>
              ))}
              {geo.axisIdx.map((i) => {
                const day = rows[i].date;
                const short = formatOverviewChartAxisLabel(day);
                const full = formatOverviewChartFullDay(day);
                return (
                  <text
                    key={`ax-${day}`}
                    x={geo.xAt(i)}
                    y={CHART_VIEW_H - 2}
                    textAnchor={i === 0 ? "start" : i === rows.length - 1 ? "end" : "middle"}
                    className={styles.chartAxisText}
                    aria-label={full}
                  >
                    <title>{full}</title>
                    {short}
                  </text>
                );
              })}
            </svg>
            <div className={styles.chartLegend} aria-label="Легенда: Рост сообщества">
              <span>
                <i className={styles.legendDot} aria-hidden="true" />
                Клиенты
              </span>
              <span>
                <i className={styles.legendDotAlt} aria-hidden="true" />
                PRO
              </span>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

export function AdminOverviewClient() {
  const [period, setPeriod] = useState<PeriodId>("7d");
  const [data, setData] = useState<ManagementOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadSeq = useRef(0);
  const [analytics, setAnalytics] = useState<AdminAnalyticsOverviewResponse | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const analyticsLoadSeq = useRef(0);
  const [clientTotal, setClientTotal] = useState<number | null>(null);
  const [clientTotalError, setClientTotalError] = useState<string | null>(null);
  const [clientTotalLoading, setClientTotalLoading] = useState(true);
  const clientTotalLoadSeq = useRef(0);

  const loadClientTotal = useCallback(async () => {
    const seq = ++clientTotalLoadSeq.current;
    setClientTotalLoading(true);
    setClientTotalError(null);
    try {
      const total = await getAdminClientTotal();
      if (seq !== clientTotalLoadSeq.current) return;
      setClientTotal(total);
    } catch (e) {
      if (seq !== clientTotalLoadSeq.current) return;
      setClientTotalError(
        e instanceof Error ? e.message : "Не удалось загрузить число клиентов",
      );
    } finally {
      if (seq === clientTotalLoadSeq.current) setClientTotalLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchManagementOverview(period);
      if (seq !== loadSeq.current) return;
      setData(next);
    } catch (e) {
      if (seq !== loadSeq.current) return;
      setError(e instanceof Error ? e.message : "Не удалось загрузить обзор");
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [period]);

  const loadAnalytics = useCallback(async () => {
    const seq = ++analyticsLoadSeq.current;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const next = await fetchAdminAnalyticsOverview(period);
      if (seq !== analyticsLoadSeq.current) return;
      setAnalytics(next);
    } catch (e) {
      if (seq !== analyticsLoadSeq.current) return;
      setAnalyticsError(e instanceof Error ? e.message : "Не удалось загрузить график регистраций");
    } finally {
      if (seq === analyticsLoadSeq.current) setAnalyticsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    void loadClientTotal();
  }, [loadClientTotal]);

  const chartPeriodId = data ? periodIdFromApi(data.period, period) : period;

  const regCard = useMemo(() => {
    if (!data) return { value: "—", note: "" };
    const block = data.registrationsCompleted;
    const sel = block.selectedPeriod ?? block.days7;
    const periodForNote = periodIdFromApi(data.period, period);
    const fromLabel = overviewPartnerRegistrationNote(block.selectedPeriodLabel, periodForNote);
    const fromComparison = overviewPartnerRegistrationNote(sel.comparisonNote, periodForNote);
    return {
      value: String(sel.current),
      note: fromLabel || fromComparison,
    };
  }, [data, period]);

  const regKindRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.registrationsCompleted.byKindInPeriod).map(([k, v]) => ({
      label: kindLabel(k),
      value: v,
    }));
  }, [data]);

  const kpiPeriodScope = periodScopePhrase(chartPeriodId);
  const analyticsPeriodId = analytics
    ? periodIdFromApi(analytics.period, period)
    : period;
  const growthChartSubtitle = `Новые регистрации за ${periodScopePhrase(analyticsPeriodId)}`;

  const clientTotalDisplay =
    clientTotalError != null
      ? "—"
      : clientTotalLoading && clientTotal == null
        ? "…"
        : clientTotal != null
          ? String(clientTotal)
          : "—";

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <h1>Обзор проекта</h1>
          <p className={styles.lead}>Главное о росте, людях и партнёрской сети</p>
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
      {error ? (
        <div className={styles.errorRow}>
          <p role="alert" className={styles.error}>
            {error}
          </p>
          <button type="button" className={styles.retryButton} onClick={() => void load()}>
            Повторить
          </button>
        </div>
      ) : null}
      {loading && !data ? <p role="status">Загрузка показателей…</p> : null}
      {data ? (
        <>
          <div className={styles.kpis}>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Партнёры</h2>
              <p className={styles.kpiValue}>{data.partners.liveRegistered}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>
                  Историческая демо-база: {data.partners.demoRegistered}
                </p>
                <Link href={OVERVIEW_PARTNERS_ACTIVE_REGISTRY_HREF}>Открыть реестр</Link>
              </div>
            </article>
            <article className={styles.kpi} data-source="admin-users-client-total">
              <h2 className={styles.kpiLabel}>Клиенты</h2>
              <p className={styles.kpiValue}>{clientTotalDisplay}</p>
              <div className={styles.kpiBottom}>
                {clientTotalError ? (
                  <>
                    <p className={styles.sub} role="alert">
                      {clientTotalError}
                    </p>
                    <button
                      type="button"
                      className={styles.retryButton}
                      onClick={() => void loadClientTotal()}
                    >
                      Повторить
                    </button>
                  </>
                ) : (
                  <>
                    <p className={styles.sub}>Всего клиентов за всё время</p>
                    <p className={styles.sub}>
                      +{data.clients.createdInPeriod.current} новых за {kpiPeriodScope}
                    </p>
                    {data.clients.historicalDemoWarning ? (
                      <details className={styles.demoNotice}>
                        <summary>Пояснение к числу клиентов</summary>
                        <p className={styles.demoNoticeBody}>{data.clients.historicalDemoWarning}</p>
                      </details>
                    ) : null}
                  </>
                )}
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>В поиске сотрудничества</h2>
              <p className={styles.kpiValue}>—</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>Показатель недоступен на обзоре</p>
              </div>
            </article>
            <article className={styles.kpi}>
              <h2 className={styles.kpiLabel}>Новые партнёры</h2>
              <p className={styles.kpiValue}>{regCard.value}</p>
              <div className={styles.kpiBottom}>
                <p className={styles.sub}>За {kpiPeriodScope}</p>
                {regCard.note ? <p className={styles.sub}>{regCard.note}</p> : null}
              </div>
            </article>
          </div>
          <section
            className={styles.dashboardSection}
            aria-label="Динамика и внимание"
            aria-busy={loading || analyticsLoading || undefined}
          >
            {(loading || analyticsLoading) && (data || analytics) ? (
              <p className={styles.chartsLoading} role="status">
                Обновление…
              </p>
            ) : null}
            <div className={styles.dashboardGrid} data-chart-period={analyticsPeriodId}>
              <CommunityGrowthPanel
                subtitle={growthChartSubtitle}
                series={analytics?.registrationsByDay}
                loading={analyticsLoading}
                error={analyticsError}
                onRetry={() => void loadAnalytics()}
                emptyLabel="Нет новых аккаунтов за выбранный период"
              />
              <section
                className={styles.attentionPanel}
                aria-label="Требует внимания"
                data-source="admin-overview-attention"
              >
                <div className={styles.chartHead}>
                  <div className={styles.chartHeadCopy}>
                    <h2 className={styles.panelTitle}>Требует внимания</h2>
                    <p className={styles.chartSubtitle}>Следующее полезное действие</p>
                  </div>
                </div>
                <ul className={styles.attentionQueue}>
                  {data.moderation.pendingPartners > 0 ? (
                    <li>
                      <Link
                        href={OVERVIEW_ATTENTION_MODERATION_PARTNERS_HREF}
                        className={styles.queueRow}
                        data-attention-target="moderation-partners-pending"
                      >
                        <span className={styles.queueCopy}>
                          <strong>Модерация партнёров</strong>
                          <small>Заявки в очереди</small>
                        </span>
                        <span className={styles.queueCount}>{data.moderation.pendingPartners}</span>
                      </Link>
                    </li>
                  ) : null}
                  {data.leadsAndRequests.leadsNew > 0 ? (
                    <li data-attention-static="leads-no-route">
                      <span className={styles.queueRowStatic}>
                        <span className={styles.queueCopy}>
                          <strong>Новые лиды</strong>
                          <small>
                            Открытых: {data.leadsAndRequests.leadsOpen}. Раздел для работы с
                            лидами пока недоступен.
                          </small>
                        </span>
                        <span className={styles.queueCount}>{data.leadsAndRequests.leadsNew}</span>
                      </span>
                    </li>
                  ) : null}
                  {data.incompleteLiveRegistration.available &&
                  data.incompleteLiveRegistration.count != null &&
                  data.incompleteLiveRegistration.count > 0 ? (
                    <li data-attention-static="incomplete-registration-no-route">
                      <span className={styles.queueRowStatic}>
                        <span className={styles.queueCopy}>
                          <strong>Незавершённые регистрации</strong>
                          <small>
                            {data.incompleteLiveRegistration.note}. Открыть отдельный список по
                            этому признаку пока нельзя.
                          </small>
                        </span>
                        <span className={styles.queueCount}>
                          {data.incompleteLiveRegistration.count}
                        </span>
                      </span>
                    </li>
                  ) : null}
                  {data.moderation.pendingPartners === 0 &&
                  data.leadsAndRequests.leadsNew === 0 &&
                  (!data.incompleteLiveRegistration.available ||
                    !data.incompleteLiveRegistration.count) ? (
                    <li className={styles.queueEmpty}>Срочных пунктов нет</li>
                  ) : null}
                </ul>
              </section>
            </div>
          </section>
          <details className={styles.secondaryBlock}>
            <summary>Дополнительные показатели</summary>
            <ul className={styles.secondaryList}>
              <li>
                Видны в каталоге: {data.partners.visibleInCatalog} (карточек:{" "}
                {data.partners.catalogCardSurfaces})
              </li>
              <li>
                Активность PROF:{" "}
                {data.activity.profPartnerProfilesUsed.distinctInPeriod ?? "—"} —{" "}
                {data.activity.profPartnerProfilesUsed.coverageNote}
              </li>
              <li>
                Просмотры карточек: {data.activity.publicPartnerCardViews.viewsInPeriod} —{" "}
                {data.activity.publicPartnerCardViews.coverageNote}
              </li>
              {regKindRows.length > 0 ? (
                <li>
                  Регистрации по видам:{" "}
                  {regKindRows.map((r) => `${r.label} ${r.value}`).join(", ")}
                </li>
              ) : null}
            </ul>
            <p className={styles.definitions}>{data.definitions.partnerProfile}</p>
          </details>
        </>
      ) : null}
    </div>
  );
}
