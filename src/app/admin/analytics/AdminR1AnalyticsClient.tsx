"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAdminR1Analytics,
  type AdminR1AnalyticsPayload,
} from "@/lib/admin-r1/api";

type Tab = "growth" | "quality";

type MetricChange = {
  current: number;
  previous: number;
  changePercent: number;
};

function isMetricChange(value: unknown): value is MetricChange {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MetricChange).current === "number"
  );
}

function formatChange(change: MetricChange | undefined): string | null {
  if (!change || typeof change.changePercent !== "number") return null;
  const sign = change.changePercent > 0 ? "+" : "";
  return `${sign}${change.changePercent}% к прошлому периоду`;
}

function MetricCard({
  label,
  value,
  bottom,
  href,
}: {
  label: string;
  value: string;
  bottom?: string | null;
  href?: string;
}) {
  const body = (
    <>
      <span className="r1KpiLabel">{label}</span>
      <strong className="r1KpiValue">{value}</strong>
      {bottom ? <span className="r1KpiBottom">{bottom}</span> : null}
    </>
  );
  if (href) {
    return (
      <Link className="r1Panel r1Kpi" href={href}>
        {body}
      </Link>
    );
  }
  return <div className="r1Panel r1Kpi">{body}</div>;
}

function metricValue(value: unknown): string {
  if (isMetricChange(value)) return String(value.current);
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "—";
}

export function AdminR1AnalyticsClient() {
  const [tab, setTab] = useState<Tab>("growth");
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AdminR1AnalyticsPayload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Overview carries growth KPIs; catalog fields are used for quality when present.
        const data = await fetchAdminR1Analytics(period, "overview");
        if (!cancelled) setPayload(data);
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : "Аналитика недоступна");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const visitors = isMetricChange(payload?.visitors) ? payload.visitors : undefined;
  const registrations = isMetricChange(payload?.registrations)
    ? payload.registrations
    : undefined;
  const requests = isMetricChange(payload?.requests) ? payload.requests : undefined;
  const conversion =
    typeof payload?.conversionPercent === "number" ? payload.conversionPercent : null;
  const aligned = payload?.alignedPartnerMetrics;
  const hasQualityMetrics =
    typeof payload?.catalogViews === "number" ||
    typeof payload?.profileViews === "number" ||
    typeof payload?.approvedPartners === "number" ||
    typeof payload?.activeServices === "number" ||
    (aligned && typeof aligned === "object");

  return (
    <div data-testid="admin-r1-analytics">
      <div className="r1Subtabs" role="tablist" aria-label="Разделы аналитики">
        <button
          type="button"
          role="tab"
          className={tab === "growth" ? "active" : undefined}
          aria-selected={tab === "growth"}
          onClick={() => setTab("growth")}
        >
          Рост
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "quality" ? "active" : undefined}
          aria-selected={tab === "quality"}
          onClick={() => setTab("quality")}
        >
          Качество базы
        </button>
        <span className="r1Pill" title="География — релиз 2">
          География · R2 скрыто
        </span>
        <select
          aria-label="Период"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{ marginLeft: "auto" }}
        >
          <option value="7d">7 дней</option>
          <option value="30d">30 дней</option>
          <option value="90d">90 дней</option>
        </select>
      </div>

      {loading ? <div className="r1StateLoading">Загрузка аналитики…</div> : null}
      {error ? (
        <div className="r1Unavailable" role="alert">
          Аналитика не загружена: {error}
        </div>
      ) : null}

      {!loading && !error && tab === "growth" ? (
        <section>
          <div className="r1Kpis">
            <MetricCard
              label="Посетители"
              value={metricValue(visitors)}
              bottom={formatChange(visitors)}
            />
            <MetricCard
              label="Регистрации"
              value={metricValue(registrations)}
              bottom={formatChange(registrations)}
              href="/admin/clients"
            />
            <MetricCard
              label="Заявки"
              value={metricValue(requests)}
              bottom={formatChange(requests)}
            />
            <MetricCard
              label="Конверсия посетитель → регистрация"
              value={conversion == null ? "—" : `${conversion}%`}
            />
          </div>
          {!visitors && !registrations && !requests && conversion == null ? (
            <div className="r1Unavailable">Показатели роста за период недоступны.</div>
          ) : (
            <p className="r1Help">
              Переходы:{" "}
              <Link href="/admin/clients">клиенты</Link>
              {" · "}
              <Link href="/admin/partners">партнёры</Link>
              {" · "}
              <Link href="/admin/results">результативность</Link>
            </p>
          )}
        </section>
      ) : null}

      {!loading && !error && tab === "quality" ? (
        <section>
          {hasQualityMetrics ? (
            <div className="r1Kpis">
              <MetricCard
                label="Просмотры каталога"
                value={metricValue(payload?.catalogViews)}
              />
              <MetricCard
                label="Просмотры профилей"
                value={metricValue(payload?.profileViews)}
              />
              <MetricCard
                label="Партнёры APPROVED"
                value={metricValue(payload?.approvedPartners)}
                href="/admin/moderation"
              />
              <MetricCard
                label="Активные услуги"
                value={metricValue(payload?.activeServices)}
              />
              {aligned && typeof aligned.liveRegistered === "number" ? (
                <MetricCard
                  label="Live-регистрации партнёров"
                  value={String(aligned.liveRegistered)}
                  href="/admin/partners"
                />
              ) : null}
              {aligned && typeof aligned.visibleInCatalog === "number" ? (
                <MetricCard
                  label="Видимы в каталоге"
                  value={String(aligned.visibleInCatalog)}
                  href="/admin/partners"
                />
              ) : null}
              {aligned && typeof aligned.demoRegistered === "number" ? (
                <MetricCard
                  label="Демо-регистрации"
                  value={String(aligned.demoRegistered)}
                />
              ) : null}
            </div>
          ) : (
            <div className="r1Panel r1PanelPad">
              <h2>Качество базы</h2>
              <p className="r1Help">
                В ответе за период нет отдельных показателей наполнения каталога. Доступны
                связанные разделы и общая конверсия.
              </p>
              <div className="r1Kpis" style={{ marginTop: 16, marginBottom: 0 }}>
                <MetricCard
                  label="Конверсия посетитель → регистрация"
                  value={conversion == null ? "—" : `${conversion}%`}
                />
                <MetricCard
                  label="Регистрации за период"
                  value={metricValue(registrations)}
                  bottom={formatChange(registrations)}
                  href="/admin/clients"
                />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
                <Link className="r1Btn small" href="/admin/moderation">
                  Модерация профилей
                </Link>
                <Link className="r1Btn small" href="/admin/partners">
                  Реестр партнёров
                </Link>
                <Link className="r1Btn small" href="/admin/results">
                  RemScore и отзывы
                </Link>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
