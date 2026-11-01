import type { AdminAnalyticsRegistrationsByDay } from "@/lib/prof-admin-overview-analytics-api";
import type { OverviewAnalyticsPeriod } from "@/lib/prof-admin-overview-analytics-api";

export type AnalyticsR1Tab = "growth" | "activity" | "quality";

export type AnalyticsFunnelRole = "CLIENT" | "PRO";

export const ANALYTICS_FUNNEL_ROLES: { id: AnalyticsFunnelRole; label: string }[] = [
  { id: "CLIENT", label: "Клиенты" },
  { id: "PRO", label: "PRO" },
];

export type FunnelStageKey = "registered" | "profileFilled" | "firstAction" | "activeRecently";

export const FUNNEL_STAGE_LABELS: Record<FunnelStageKey, string> = {
  registered: "Регистрация",
  profileFilled: "Заполнил профиль",
  firstAction: "Первое действие",
  activeRecently: "Активен 7д",
};

export const ANALYTICS_R1_TABS: { id: AnalyticsR1Tab; label: string }[] = [
  { id: "growth", label: "Рост и воронка" },
  { id: "activity", label: "Активность" },
  { id: "quality", label: "Качество базы" },
];

export const ANALYTICS_READER_PERIODS: { id: OverviewAnalyticsPeriod; label: string }[] = [
  { id: "7d", label: "7 дней" },
  { id: "30d", label: "30 дней" },
];

export function sumRegistrationSeries(series: AdminAnalyticsRegistrationsByDay[] | undefined): {
  clients: number | null;
  pros: number | null;
} {
  if (!series || series.length === 0) return { clients: null, pros: null };
  let clients = 0;
  let pros = 0;
  for (const row of series) {
    clients += row.clients;
    pros += row.pros;
  }
  return { clients, pros };
}

export function formatMetricValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}

export function periodScopeLabel(period: OverviewAnalyticsPeriod): string {
  if (period === "1d") return "сегодня";
  if (period === "30d") return "30 дней";
  return "7 дней";
}

export function parseAnalyticsTab(raw: string | null): AnalyticsR1Tab {
  if (raw === "activity" || raw === "quality") return raw;
  return "growth";
}

export function parseAnalyticsPeriod(raw: string | null): OverviewAnalyticsPeriod {
  if (raw === "30d" || raw === "1d") return raw;
  return "7d";
}

export function parseAnalyticsFunnelRole(raw: string | null): AnalyticsFunnelRole {
  return raw === "PRO" ? "PRO" : "CLIENT";
}
