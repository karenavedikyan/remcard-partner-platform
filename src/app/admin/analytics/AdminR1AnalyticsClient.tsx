"use client";

import { useEffect, useState } from "react";
import { fetchAdminR1Analytics } from "@/lib/admin-r1/api";

type Tab = "growth" | "quality";

export function AdminR1AnalyticsClient() {
  const [tab, setTab] = useState<Tab>("growth");
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminR1Analytics(period);
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

  const metrics = payload && typeof payload === "object" ? payload : null;

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
          Аналитика не загружена: {error}. Не показываем нули вместо ошибки.
        </div>
      ) : null}
      {!loading && !error && tab === "growth" ? (
        <section className="r1Panel r1PanelPad">
          <h2>Рост за период</h2>
          <p className="r1Help">
            Данные из GET /api/pro/admin/analytics (существующая модель PROF). Синтетические тренды
            прототипа не подставляются.
          </p>
          {metrics ? (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                marginTop: 12,
                overflow: "auto",
                maxHeight: 480,
              }}
            >
              {JSON.stringify(pickGrowth(metrics), null, 2)}
            </pre>
          ) : (
            <div className="r1Unavailable">Поля периода недоступны в ответе API.</div>
          )}
        </section>
      ) : null}
      {!loading && !error && tab === "quality" ? (
        <section className="r1Panel r1PanelPad">
          <h2>Качество базы</h2>
          <p className="r1Help">
            Очереди модерации и демо — через существующие счётчики. Без кураторских сигналов R2.
          </p>
          {metrics ? (
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                marginTop: 12,
                overflow: "auto",
                maxHeight: 480,
              }}
            >
              {JSON.stringify(pickQuality(metrics), null, 2)}
            </pre>
          ) : (
            <div className="r1Unavailable">Нет данных качества в ответе.</div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function pickGrowth(data: Record<string, unknown>) {
  const keys = [
    "period",
    "registrations",
    "visitors",
    "requests",
    "partners",
    "clients",
    "series",
    "totals",
    "metrics",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in data) out[k] = data[k];
  if (Object.keys(out).length === 0) return { availableKeys: Object.keys(data) };
  return out;
}

function pickQuality(data: Record<string, unknown>) {
  const keys = ["moderation", "catalog", "quality", "pending", "funnel"];
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in data) out[k] = data[k];
  if (Object.keys(out).length === 0) return { availableKeys: Object.keys(data) };
  return out;
}
