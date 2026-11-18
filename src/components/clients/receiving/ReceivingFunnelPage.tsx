"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ReceivingSubpageHead } from "./ReceivingSubpageHead";
import {
  fetchReceivingFunnel,
  formatReceivingPaidRubFromKopecks,
  type ReceivingFunnel,
} from "@/lib/clients-parity/receiving-appeals-api";

type Preset = "30" | "90" | "all" | "custom";

const PRESET_LABELS: Record<Exclude<Preset, "custom">, string> = {
  "30": "30 дней",
  "90": "90 дней",
  all: "Всё время",
};

/** The server reads `from`/`to` as UTC calendar days, so presets are computed in UTC as well. */
function utcDay(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function presetRange(preset: Exclude<Preset, "custom">): { from: string; to: string } {
  if (preset === "all") return { from: "", to: "" };
  return { from: utcDay(Number(preset)), to: utcDay(0) };
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "—";
}

function width(part: number, whole: number): number {
  return whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;
}

type Props = {
  onBack: () => void;
  /** Employee's branch filter, when one is selected. */
  branchId?: string | null;
  branchScope?: "all";
  /** Test seam; production uses the real BFF route. */
  fetchFunnel?: typeof fetchReceivingFunnel;
};

/**
 * Prototype `renderFunnelPage` for the receiving owner. Numbers come from the server aggregation of
 * the whole permitted set (never from the loaded list page). Cohort: appeals created in the period,
 * excluding the trash and including the archive. Denominator: all appeals of that cohort.
 */
export function ReceivingFunnelPage({ onBack, branchId, branchScope, fetchFunnel = fetchReceivingFunnel }: Props) {
  const initial = presetRange("30");
  const [preset, setPreset] = useState<Preset>("30");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "error"; message: string }
    | { phase: "ready"; funnel: ReceivingFunnel }
  >({ phase: "loading" });
  const [reload, setReload] = useState(0);

  const rangeInvalid = Boolean(from && to && from > to);

  useEffect(() => {
    if (rangeInvalid) return;
    const controller = new AbortController();
    setState({ phase: "loading" });
    fetchFunnel(
      { from: from || undefined, to: to || undefined, ...(branchId ? { branchId } : branchScope ? { branchScope } : {}) },
      controller.signal,
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setState(res.ok ? { phase: "ready", funnel: res.funnel } : { phase: "error", message: res.message });
      })
      .catch(() => {
        // Only a deliberate abort (new period / unmount) rethrows.
      });
    return () => controller.abort();
  }, [from, to, branchId, branchScope, rangeInvalid, reload, fetchFunnel]);

  const applyPreset = useCallback((p: Exclude<Preset, "custom">) => {
    const range = presetRange(p);
    setPreset(p);
    setFrom(range.from);
    setTo(range.to);
  }, []);

  const f = state.phase === "ready" ? state.funnel : null;
  const bars = useMemo(() => {
    if (!f) return [];
    return [
      { label: "Обращения", n: f.total, prev: 0 },
      { label: "Оплачено", n: f.paid, prev: f.total },
      { label: "Отгружено", n: f.shipped, prev: f.paid },
    ];
  }, [f]);

  const strip = f
    ? ([
        ["Обращения", String(f.total)],
        ["Оплачено", String(f.paid)],
        ["Отгружено", String(f.shipped)],
        ["Возвраты", String(f.returned)],
        ["Средний чек", formatReceivingPaidRubFromKopecks(f.avgCheckKopecks) ?? "—"],
      ] as const)
    : null;

  return (
    <div className="stack ca-section" data-testid="ca-receiving-analytics">
      <ReceivingSubpageHead
        onBack={onBack}
        title="Аналитика"
        subtitle="Как обращения превращаются в покупки."
        subtitleTestId="ca-receiving-analytics-subtitle"
      />

      <section className="panel stack ca-analytics" aria-label="Воронка обращений">
        <div className="ca-period-row" role="group" aria-label="Период">
          {(Object.keys(PRESET_LABELS) as Exclude<Preset, "custom">[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`btn ghost small-btn${preset === p ? " is-active" : ""}`}
              aria-pressed={preset === p}
              data-testid={`ca-funnel-preset-${p}`}
              onClick={() => applyPreset(p)}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
          <label className="field">
            С
            <input
              type="date"
              value={from}
              max={to || undefined}
              data-testid="ca-funnel-from"
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
              }}
            />
          </label>
          <label className="field">
            По
            <input
              type="date"
              value={to}
              min={from || undefined}
              data-testid="ca-funnel-to"
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
              }}
            />
          </label>
        </div>

        {rangeInvalid ? (
          <p className="notice" role="alert" data-testid="ca-funnel-range-error">
            Дата «С» не может быть позже даты «По».
          </p>
        ) : null}

        {!rangeInvalid && state.phase === "loading" ? (
          <p className="notice" role="status" aria-busy="true" data-testid="ca-funnel-loading">
            Загрузка аналитики…
          </p>
        ) : null}

        {!rangeInvalid && state.phase === "error" ? (
          <div className="notice" role="alert" data-testid="ca-funnel-error">
            <p>{state.message}</p>
            <button type="button" className="btn ghost small-btn" onClick={() => setReload((n) => n + 1)}>
              Повторить
            </button>
          </div>
        ) : null}

        {!rangeInvalid && f && strip ? (
          <>
            <div className="ca-kpi-strip ca-kpi-strip--analytics" role="list" data-testid="ca-funnel-kpis">
              {strip.map(([label, value]) => (
                <div key={label} className="ca-kpi panel" role="listitem">
                  <span className="small muted">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {f.total === 0 ? (
              <p className="notice" data-testid="ca-funnel-empty">
                За период обращений нет — создайте первое сканированием или вручную.
              </p>
            ) : null}
            <div className="ca-funnel" data-testid="ca-funnel-bars">
              {bars.map((b) => (
                <div key={b.label} className="ca-funnel-bar">
                  <div className="ca-funnel-bar-head">
                    <span>{b.label}</span>
                    <strong>{b.n}</strong>
                  </div>
                  <div
                    className="ca-bar-track"
                    role="img"
                    aria-label={`${b.label}: ${b.n}, ${pct(b.n, f.total)} от всех`}
                  >
                    <i style={{ width: `${width(b.n, f.total)}%` }} />
                  </div>
                  <small className="muted">
                    {b.prev === 0 && b.label === "Обращения" ? "" : `${pct(b.n, b.prev)} от пред. · `}
                    {pct(b.n, f.total)} от всех
                  </small>
                </div>
              ))}
            </div>
            <p className="small muted">
              Возвраты: <strong>{f.returned}</strong> · учитываются отдельно
            </p>
            <div className="ca-compare" data-testid="ca-funnel-compare">
              <div>
                <span className="small muted">По сертификату</span>
                <div className="ca-bar-track ca-bar-track--sm">
                  <i style={{ width: `${width(f.certificate.paid, f.certificate.total)}%` }} />
                </div>
                <small>
                  {f.certificate.total} обр. · опл. {pct(f.certificate.paid, f.certificate.total)}
                </small>
              </div>
              <div>
                <span className="small muted">Вручную</span>
                <div className="ca-bar-track ca-bar-track--sm">
                  <i style={{ width: `${width(f.manual.paid, f.manual.total)}%` }} />
                </div>
                <small>
                  {f.manual.total} обр. · опл. {pct(f.manual.paid, f.manual.total)}
                </small>
              </div>
            </div>
            <p className="small muted" data-testid="ca-funnel-cohort-note">
              Считаются все обращения, созданные в выбранный период, включая архив, без корзины. Конверсия — доля
              оплаченных среди них{f.total === 0 ? "; пока обращений нет, процент не показывается" : ""}.
            </p>
          </>
        ) : null}
      </section>
    </div>
  );
}
