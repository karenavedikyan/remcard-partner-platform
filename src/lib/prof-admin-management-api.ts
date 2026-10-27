import { remcardFetch } from "@/lib/api-client";

export type PartnerRegistryFacets = {
  matchedTotal: number;
  partnerKind: {
    all: number;
    agent: number;
    specialist: number;
    store: number;
    company: number;
    unknown: number;
    facetRule: string;
  };
  registration: { active: number; demo: number; facetRule: string };
  catalog: { visible: number; hidden: number; notPublic: number; facetRule: string };
  archive: { archived: number; notArchived: number; facetRule: string };
};

export type ManagementOverview = {
  generatedAt: string;
  timezone: string;
  period: "1d" | "7d" | "30d";
  periodLabel: string;
  definitions: Record<string, string>;
  partners: {
    liveRegistered: number;
    demoRegistered: number;
    visibleInCatalog: number;
    catalogCardSurfaces: number;
  };
  registrationsCompleted: {
    today: { current: number; comparisonNote: string | null };
    days7: { current: number; comparisonNote: string | null };
    days30: { current: number; comparisonNote: string | null };
    byKindInPeriod: Record<string, number>;
    seriesDaily: {
      date: string;
      agent: number;
      specialist: number;
      store: number;
      company: number;
      total: number;
    }[];
    selectedPeriod?: { current: number; comparisonNote: string | null };
    selectedPeriodLabel?: string;
  };
  activitySeriesDaily?: { date: string; profPartnerProfiles: number }[];
  clients: {
    accountedTotal: number;
    createdInPeriod: { current: number; comparisonNote: string | null };
    historicalDemoWarning: string;
  };
  moderation: {
    pendingPartners: number;
    oldestPendingPartnerAt: string | null;
    pendingReviews: number;
  };
  leadsAndRequests: { leadsOpen: number; leadsNew: number; requestsToday: number };
  activity: {
    profPartnerProfilesUsed: {
      collectionStartedAt: string | null;
      distinctInPeriod: number | null;
      coverageNote: string;
    };
    publicSiteAuthenticatedPartners: { distinctInPeriod: number | null; coverageNote: string };
    publicPartnerCardViews: { viewsInPeriod: number; coverageNote: string };
  };
  incompleteLiveRegistration: { available: boolean; count: number | null; note: string };
};

export async function fetchManagementOverview(period: string): Promise<ManagementOverview> {
  const qs = period ? `?period=${encodeURIComponent(period)}` : "";
  return remcardFetch<ManagementOverview>(`/api/pro/admin/management/overview${qs}`);
}

export async function recordProfSessionVisit(): Promise<void> {
  await remcardFetch("/api/pro/activity/session-visit", { method: "POST", body: {} });
}
