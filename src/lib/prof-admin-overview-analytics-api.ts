import { remcardFetch } from "@/lib/api-client";

export type OverviewAnalyticsPeriod = "1d" | "7d" | "30d";

export type AdminAnalyticsRegistrationsByDay = {
  date: string;
  clients: number;
  pros: number;
};

/** Read-only slice of GET /api/admin/analytics?tab=overview (navigator backend). */
export type AdminAnalyticsOverviewResponse = {
  tab: "overview";
  period: string;
  registrationsByDay: AdminAnalyticsRegistrationsByDay[];
};

export async function fetchAdminAnalyticsOverview(
  period: OverviewAnalyticsPeriod,
  signal?: AbortSignal,
): Promise<AdminAnalyticsOverviewResponse> {
  const qs = new URLSearchParams({ tab: "overview", period });
  return remcardFetch<AdminAnalyticsOverviewResponse>(`/api/admin/analytics?${qs.toString()}`, {
    signal,
  });
}
