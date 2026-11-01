import type { ManagementOverview } from "@/lib/prof-admin-management-api";
import type { OverviewAnalyticsPeriod } from "@/lib/prof-admin-overview-analytics-api";
import { formatMetricValue } from "./adminAnalyticsR1Presentation";

/** Frozen R1 activity KPI chrome — values only when backend field matches semantics. */
export type FrozenActivityKpi = {
  id: string;
  title: string;
  note: string;
  value: string;
  available: boolean;
};

export function buildFrozenActivityKpis(
  management: ManagementOverview | null,
  period: OverviewAnalyticsPeriod,
): FrozenActivityKpi[] {
  const periodLabel = period === "30d" ? "30" : "7";
  const cabinetVisits = management?.activity.profPartnerProfilesUsed.distinctInPeriod ?? null;

  return [
    {
      id: "consent-yes",
      title: "С согласием на аналитику",
      note: "Учитываются в статистике",
      value: "—",
      available: false,
    },
    {
      id: "cabinet-period",
      title: "Были в кабинете",
      note: `За ${periodLabel} дней`,
      value: formatMetricValue(cabinetVisits),
      available: cabinetVisits !== null,
    },
    {
      id: "inactive-14d",
      title: "Не заходили > 14 дней",
      note: "Есть повод связаться",
      value: "—",
      available: false,
    },
    {
      id: "consent-no",
      title: "Без согласия",
      note: "Не считаем визиты",
      value: "—",
      available: false,
    },
  ];
}

export type FrozenQualityRow = {
  label: string;
  value: string;
  available: boolean;
};

export const FROZEN_PROFILE_DIRECTIONS = [
  "Агенты",
  "Специалисты",
  "Магазины",
  "Компании",
] as const;

export function buildFrozenQualityRows(management: ManagementOverview | null): {
  profileFill: { available: false; hint: string };
  baseWork: FrozenQualityRow[];
} {
  const mod = management?.moderation;
  return {
    profileFill: {
      available: false,
      hint: "Нет поля среднего по направлению в ответе overview.",
    },
    baseWork: [
      {
        label: "Проверить профиль",
        value: mod ? String(mod.pendingPartners) : "—",
        available: !!mod,
      },
      {
        label: "Отзывы на проверке",
        value: mod ? String(mod.pendingReviews) : "—",
        available: !!mod,
      },
    ],
  };
}
