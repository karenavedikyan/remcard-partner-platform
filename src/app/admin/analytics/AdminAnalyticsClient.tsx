"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchAdminAnalyticsOverview,
  type AdminAnalyticsRegistrationsByDay,
  type OverviewAnalyticsPeriod,
} from "@/lib/prof-admin-overview-analytics-api";
import { fetchManagementOverview, type ManagementOverview } from "@/lib/prof-admin-management-api";
import { buildLineGeometry } from "../overview/overviewLineChartGeometry";
import {
  buildFrozenActivityKpis,
  buildFrozenQualityRows,
  FROZEN_PROFILE_DIRECTIONS,
} from "./adminAnalyticsActivityPresentation";
import {
  ANALYTICS_FUNNEL_ROLES,
  ANALYTICS_R1_TABS,
  ANALYTICS_READER_PERIODS,
  FUNNEL_STAGE_LABELS,
  formatMetricValue,
  parseAnalyticsFunnelRole,
  parseAnalyticsPeriod,
  parseAnalyticsTab,
  periodScopeLabel,
  type AnalyticsFunnelRole,
  type AnalyticsR1Tab,
  type FunnelStageKey,
} from "./adminAnalyticsR1Presentation";
import {
  getAdminUserFunnel,
  type AdminUserFunnel,
  type AdminUserFunnelRole,
} from "@/lib/prof-admin-clients-api";
import styles from "./AdminAnalytics.module.css";

const CHART_VIEW_H = 204;
const FUNNEL_STAGES: FunnelStageKey[] = [
  "registered",
  "profileFilled",
  "firstAction",
  "activeRecently",
];

function GrowthChart({
  series,
  period,
}: {
  series: AdminAnalyticsRegistrationsByDay[];
  period: OverviewAnalyticsPeriod;
}) {
  const gradClients = `an-clients-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
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

  const clientValues = series.map((r) => r.clients);
  const proValues = series.map((r) => r.pros);
  const sharedMaximum = Math.max(0, ...clientValues, ...proValues);
  const clientGeo = buildLineGeometry(clientValues, plotW, CHART_VIEW_H, sharedMaximum);
  const proGeo = buildLineGeometry(proValues, plotW, CHART_VIEW_H, sharedMaximum);
  const labelX = Math.max(4, clientGeo.padL - 6);

  return (
    <section className={styles.panel} data-source="admin-analytics-r1-growth">
      <div className={styles.panelHead}>
        <div>
          <h2>Рост сообщества</h2>
          <p>
            Новые регистрации за {periodScopeLabel(period)} · клиенты и профессиональные аккаунты
          </p>
        </div>
      </div>
      <div ref={wrapRef} className={styles.chartFrame}>
        <svg
          className={styles.growthChart}
          viewBox={`0 0 ${plotW} ${CHART_VIEW_H}`}
          width={plotW}
          role="img"
          aria-label={`Новые регистрации: ${series.length} точек`}
        >
          <defs>
            <linearGradient id={gradClients} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--primary)" stopOpacity="0.14" />
              <stop offset="1" stopColor="var(--primary)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {clientGeo.guides.map((g, gi) => (
            <g key={`g-${gi}`}>
              <line x1={clientGeo.padL} y1={g.y} x2={plotW - 8} y2={g.y} stroke="var(--line)" />
              <text x={labelX} y={g.y + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
                {g.label}
              </text>
            </g>
          ))}
          <path d={clientGeo.areaPath} fill={`url(#${gradClients})`} />
          <path
            d={clientGeo.linePath}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={proGeo.linePath}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="2"
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
          {series.map((row, i) => (
            <g key={row.date} data-testid="analytics-registration-points">
              <circle cx={clientGeo.xAt(i)} cy={clientGeo.yAt(row.clients)} r="3" fill="var(--primary)">
                <title>{`${row.date}: клиенты ${row.clients}`}</title>
              </circle>
              <circle cx={proGeo.xAt(i)} cy={proGeo.yAt(row.pros)} r="3" fill="var(--muted)">
                <title>{`${row.date}: PRO ${row.pros}`}</title>
              </circle>
            </g>
          ))}
          {clientGeo.axisIdx.map((i) => {
            const row = series[i];
            if (!row) return null;
            const date = new Date(row.date);
            const label = Number.isNaN(date.getTime()) ? row.date : new Intl.DateTimeFormat("ru-RU", {
              day: "2-digit", month: "2-digit", timeZone: "Europe/Moscow",
            }).format(date);
            return <text key={row.date} x={clientGeo.xAt(i)} y={CHART_VIEW_H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">{label}</text>;
          })}
        </svg>
        <div className={styles.chartLegend} aria-label="Легенда: новые регистрации">
          <span>
            <i className={styles.legendSwatch} aria-hidden="true" />
            Клиенты
          </span>
          <span>
            <i className={`${styles.legendSwatch} ${styles.legendSwatchAlt}`} aria-hidden="true" />
            PRO
          </span>
        </div>
      </div>
    </section>
  );
}

function FunnelStagesPanel({
  role,
  funnel,
  period,
}: {
  role: AnalyticsFunnelRole;
  funnel: AdminUserFunnel;
  period: OverviewAnalyticsPeriod;
}) {
  const base = funnel.registered || 0;
  return (
    <section className={styles.panel} data-source="admin-analytics-funnel" aria-label="Этапы воронки">
      <div className={styles.panelHead}>
        <div>
          <h2>
            Этапы воронки · {role === "CLIENT" ? "клиенты" : "PRO"}
          </h2>
          <p>
            За всё время · этапы регистрации, независимо от выбранного периода графика
          </p>
        </div>
      </div>
      <div className={styles.funnelGrid}>
        {FUNNEL_STAGES.map((stage) => {
          const value = funnel[stage];
          const widthPct = base > 0 ? Math.min(100, Math.round((value / base) * 100)) : 0;
          return (
            <div key={stage} className={styles.funnelRow}>
              <span className={styles.funnelLabel}>{FUNNEL_STAGE_LABELS[stage]}</span>
              <div className={styles.barTrack}>
                <span style={{ width: `${widthPct}%` }} />
              </div>
              <strong>{formatMetricValue(value)}</strong>
            </div>
          );
        })}
      </div>
      <p className={styles.kpiNote}>
        Доли этапов: профиль {funnel.pctProfile}% · первое действие {funnel.pctFirst}% · активность
        7д {funnel.pctActive}%
      </p>
    </section>
  );
}

function mapLoadError(err: unknown): { message: string; forbidden: boolean; unauthorized: boolean } {
  const raw = err instanceof Error ? err.message : "Не удалось загрузить данные";
  const message =
    raw.toLowerCase().includes("upstream unavailable") || raw.includes("503")
      ? "Сервис временно недоступен"
      : raw;
  const lower = message.toLowerCase();
  return {
    message,
    forbidden: lower.includes("forbidden") || lower.includes("403"),
    unauthorized: lower.includes("401") || lower.includes("unauthorized"),
  };
}

export function AdminAnalyticsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = parseAnalyticsTab(searchParams.get("tab"));
  const period = parseAnalyticsPeriod(searchParams.get("period"));
  const funnelRole = parseAnalyticsFunnelRole(searchParams.get("funnelRole"));

  const [analytics, setAnalytics] = useState<AdminAnalyticsRegistrationsByDay[] | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<AdminUserFunnel | null>(null);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [management, setManagement] = useState<ManagementOverview | null>(null);
  const [managementError, setManagementError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** A30a: ignore late results from superseded loads; bump on unmount. */
  const loadGenRef = useRef(0);

  const setParams = useCallback(
    (updates: {
      tab?: AnalyticsR1Tab;
      period?: OverviewAnalyticsPeriod;
      funnelRole?: AnalyticsFunnelRole;
    }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (updates.tab !== undefined) {
        if (updates.tab === "growth") p.delete("tab");
        else p.set("tab", updates.tab);
      }
      if (updates.period !== undefined) {
        if (updates.period === "7d") p.delete("period");
        else p.set("period", updates.period);
      }
      if (updates.funnelRole !== undefined) {
        if (updates.funnelRole === "CLIENT") p.delete("funnelRole");
        else p.set("funnelRole", updates.funnelRole);
      }
      router.push(`/admin/analytics?${p.toString()}`);
    },
    [router, searchParams],
  );

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    const stillCurrent = () => gen === loadGenRef.current;

    setLoading(true);
    setAnalyticsError(null);
    setFunnelError(null);
    setManagementError(null);
    // Period-dependent snapshots must not linger under a new period label while in flight.
    setAnalytics(null);
    setManagement(null);
    // Funnel is all-time but role-scoped — clear so CLIENT data cannot sit under PRO chrome.
    setFunnel(null);

    try {
      const overview = await fetchAdminAnalyticsOverview(period);
      if (!stillCurrent()) return;
      setAnalytics(overview.registrationsByDay ?? []);
    } catch (e) {
      if (!stillCurrent()) return;
      const mapped = mapLoadError(e);
      setAnalytics(null);
      setAnalyticsError(
        mapped.unauthorized
          ? "Требуется вход администратора."
          : mapped.forbidden
            ? "Нет доступа к аналитике. Обратитесь к владельцу платформы."
            : mapped.message,
      );
    }

    try {
      const snapshot = await getAdminUserFunnel(funnelRole as AdminUserFunnelRole);
      if (!stillCurrent()) return;
      if (!snapshot) {
        throw new Error("Не удалось получить этапы регистрации. Повторите загрузку.");
      }
      setFunnel(snapshot);
    } catch (e) {
      if (!stillCurrent()) return;
      setFunnel(null);
      const mapped = mapLoadError(e);
      setFunnelError(
        mapped.unauthorized
          ? "Требуется вход администратора."
          : mapped.forbidden
            ? "Нет доступа к срезу пользователей."
            : mapped.message,
      );
    }

    try {
      const mgmtPeriod = period === "30d" ? "30d" : period === "1d" ? "1d" : "7d";
      const overview = await fetchManagementOverview(mgmtPeriod);
      if (!stillCurrent()) return;
      setManagement(overview);
    } catch (e) {
      if (!stillCurrent()) return;
      setManagement(null);
      setManagementError(mapLoadError(e).message);
    }
    if (!stillCurrent()) return;
    setLoading(false);
  }, [period, funnelRole]);

  useEffect(() => {
    void load();
    return () => {
      // Invalidate in-flight work so late resolutions cannot setState after unmount / supersession.
      loadGenRef.current += 1;
    };
  }, [load]);

  const activityKpis = useMemo(
    () => buildFrozenActivityKpis(management, period),
    [management, period],
  );
  const quality = useMemo(() => buildFrozenQualityRows(management), [management]);

  const growthReady = analytics !== null && !analyticsError;

  const onTabListKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const idx = ANALYTICS_R1_TABS.findIndex((t) => t.id === tab);
      if (idx < 0) return;
      let next = idx;
      if (event.key === "ArrowRight") next = (idx + 1) % ANALYTICS_R1_TABS.length;
      else if (event.key === "ArrowLeft") next = (idx - 1 + ANALYTICS_R1_TABS.length) % ANALYTICS_R1_TABS.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = ANALYTICS_R1_TABS.length - 1;
      else return;
      event.preventDefault();
      setParams({ tab: ANALYTICS_R1_TABS[next]!.id });
    },
    [setParams, tab],
  );

  return (
    <div className={styles.wrap} data-admin-analytics="a30a">
      <header className={styles.header}>
        <div>
          <h1>Аналитика</h1>
          <p className={styles.lead}>От показателя к конкретным записям</p>
        </div>
        <div className={styles.periods} role="group" aria-label="Период">
          {ANALYTICS_READER_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={period === p.id ? styles.periodActive : styles.period}
              aria-pressed={period === p.id}
              onClick={() => setParams({ period: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div
        className={styles.subtabs}
        role="tablist"
        aria-label="Разделы аналитики"
        onKeyDown={onTabListKeyDown}
      >
        {ANALYTICS_R1_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`analytics-tab-${t.id}`}
            aria-controls={`analytics-panel-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            className={tab === t.id ? styles.subtabActive : styles.subtab}
            onClick={() => setParams({ tab: t.id })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {analyticsError && tab === "growth" ? (
        <div className={styles.error} role="alert">
          <p>{analyticsError}</p>
          <button type="button" className={styles.retry} onClick={() => void load()}>
            Повторить загрузку
          </button>
        </div>
      ) : null}

      {loading && tab === "growth" && !analytics && !analyticsError ? (
        <p role="status">Загрузка…</p>
      ) : null}

      {tab === "growth" && growthReady ? (
        <div role="tabpanel" id="analytics-panel-growth" aria-labelledby="analytics-tab-growth">
          {analytics.length > 0 ? (
            <GrowthChart series={analytics} period={period} />
          ) : (
            <p className={styles.empty}>За выбранный период новых регистраций нет.</p>
          )}
          <div className={styles.funnelRoleSwitch} role="group" aria-label="Роль для этапов воронки">
            {ANALYTICS_FUNNEL_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={funnelRole === r.id ? styles.periodActive : styles.period}
                aria-pressed={funnelRole === r.id}
                onClick={() => setParams({ funnelRole: r.id })}
              >
                {r.label}
              </button>
            ))}
          </div>
          {funnelError ? (
            <div className={styles.error} role="alert">
              <p>{funnelError}</p>
              <button type="button" className={styles.retry} onClick={() => void load()}>
                Повторить
              </button>
            </div>
          ) : null}
          {funnel && !funnelError ? (
            <FunnelStagesPanel role={funnelRole} funnel={funnel} period={period} />
          ) : null}
        </div>
      ) : null}

      {tab === "activity" ? (
        <section
          role="tabpanel"
          id="analytics-panel-activity"
          aria-labelledby="analytics-tab-activity"
          className={styles.panel}
          data-source="admin-analytics-activity"
          aria-label="Активность"
        >
          {managementError ? (
            <div className={styles.error} role="alert">
              <p>{managementError}</p>
              <button type="button" className={styles.retry} onClick={() => void load()}>
                Повторить
              </button>
            </div>
          ) : null}
          {!managementError && loading ? <p role="status">Загрузка…</p> : null}
          <div className={styles.kpis}>
            {activityKpis.map((kpi) => (
              <article
                key={kpi.id}
                className={kpi.available ? styles.kpi : `${styles.kpi} ${styles.kpiMuted}`}
              >
                <h3>{kpi.title}</h3>
                <p className={styles.kpiValue}>{kpi.value}</p>
                <p className={styles.kpiNote}>{kpi.note}</p>
              </article>
            ))}
          </div>
          <section className={styles.panelInset} aria-label="Активность направлений">
            <div className={styles.panelHead}>
              <div>
                <h2>Активность направлений</h2>
                <p>Уникальные партнёры с согласием</p>
              </div>
            </div>
            <p className={styles.unavailableHint}>Нет среза по направлениям в overview — показатель недоступен.</p>
            <div className={styles.directionGrid}>
              {FROZEN_PROFILE_DIRECTIONS.map((label) => (
                <div key={label} className={styles.directionRow}>
                  <span className={styles.directionLabel}>{label}</span>
                  <div className={styles.barTrack}>
                    <span style={{ width: "0%" }} />
                  </div>
                  <strong>—</strong>
                </div>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {tab === "quality" ? (
        <div
          role="tabpanel"
          id="analytics-panel-quality"
          aria-labelledby="analytics-tab-quality"
          className={styles.twoCol}
          data-source="admin-analytics-quality"
        >
          {managementError ? (
            <div className={styles.error} role="alert">
              <p>{managementError}</p>
              <button type="button" className={styles.retry} onClick={() => void load()}>
                Повторить
              </button>
            </div>
          ) : null}
          <section className={styles.panel} aria-label="Заполненность профилей">
            <div className={styles.panelHead}>
              <div>
                <h2>Заполненность профилей</h2>
                <p>Среднее по направлению</p>
              </div>
            </div>
            <p className={styles.unavailableHint}>{quality.profileFill.hint}</p>
            <div className={styles.directionGrid}>
              {FROZEN_PROFILE_DIRECTIONS.map((label) => (
                <div key={label} className={styles.directionRow}>
                  <span className={styles.directionLabel}>{label}</span>
                  <div className={styles.barTrack}>
                    <span style={{ width: "0%" }} />
                  </div>
                  <strong>—</strong>
                </div>
              ))}
            </div>
          </section>
          <section className={styles.panel} aria-label="Работа с базой">
            <div className={styles.panelHead}>
              <div>
                <h2>Работа с базой</h2>
                <p>Контроль и доработка</p>
              </div>
            </div>
            {quality.baseWork.map((row) => (
              <div key={row.label} className={styles.barRow}>
                <span>{row.label}</span>
                <div className={styles.barTrack}>
                  <span
                    style={{
                      width: row.available ? `${Math.min(100, Number(row.value) * 8)}%` : "0%",
                    }}
                  />
                </div>
                <strong>{row.value}</strong>
              </div>
            ))}
            <p className={styles.kpiNote}>
              <Link href="/admin/moderation">Очередь модерации</Link>
            </p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
