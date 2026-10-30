import type { ManagementOverview } from "@/lib/prof-admin-management-api";
import type { ModerationQueueResponse } from "@/lib/prof-admin-moderation-api";
import type { ModerationPartnerDetail } from "@/lib/prof-admin-moderation-partner-display";

export function managementOverview(period: string): ManagementOverview {
  return {
    generatedAt: "2026-10-28T12:00:00.000Z",
    timezone: "Europe/Moscow",
    period: period as ManagementOverview["period"],
    periodLabel: period,
    partners: { liveRegistered: 12, demoRegistered: 8, visibleInCatalog: 9, catalogCardSurfaces: 11 },
    registrationsCompleted: {
      today: { current: 2, comparisonNote: null },
      days7: { current: 14, comparisonNote: "+3 к прошлой неделе" },
      days30: { current: 48, comparisonNote: null },
      byKindInPeriod: { agent: 3, specialist: 5, store: 2, company: 4 },
      seriesDaily: [
        { date: "2026-10-26", agent: 1, specialist: 0, store: 1, company: 0, total: 2 },
        { date: "2026-10-27", agent: 0, specialist: 2, store: 0, company: 1, total: 3 },
        { date: "2026-10-28", agent: 2, specialist: 1, store: 1, company: 2, total: 6 },
      ],
      selectedPeriod: { current: period === "1d" ? 2 : period === "30d" ? 48 : 14, comparisonNote: null },
      selectedPeriodLabel: period,
    },
    activitySeriesDaily: [],
    clients: {
      accountedTotal: 44,
      createdInPeriod: { current: 9, comparisonNote: null },
      historicalDemoWarning: "Историческая демо-база не учитывается в live-метриках.",
    },
    moderation: { pendingPartners: 6, oldestPendingPartnerAt: "2026-10-20T00:00:00.000Z", pendingReviews: 1 },
    leadsAndRequests: { leadsOpen: 3, leadsNew: 1, requestsToday: 2 },
    activity: {
      profPartnerProfilesUsed: {
        collectionStartedAt: "2026-10-01T00:00:00.000Z",
        distinctInPeriod: 18,
        coverageNote: "Harness synthetic",
      },
      publicSiteAuthenticatedPartners: { distinctInPeriod: 12, coverageNote: "Harness synthetic" },
      publicPartnerCardViews: { viewsInPeriod: 210, coverageNote: "Harness synthetic" },
    },
    definitions: { partnerProfile: "Один профиль партнёра" },
    incompleteLiveRegistration: { available: true, count: 2, note: "Незавершённые live-регистрации" },
  };
}

const longPartnerName =
  "ООО «Строительно-монтажное объединение Южный берег с очень длинным названием для мобильной вёрстки»";

const REGISTRY_KINDS = [
  { partnerType: "COMPANY", partnerKind: "company", city: "Краснодар" },
  { partnerType: "AGENT", partnerKind: "agent", city: "Сочи" },
  { partnerType: "STORE", partnerKind: "store", city: "Москва" },
  { partnerType: "MASTER", partnerKind: "specialist", city: "Санкт-Петербург" },
] as const;

function syntheticRegistryRow(index: number) {
  const kind = REGISTRY_KINDS[index % REGISTRY_KINDS.length];
  const isDemo = index % 5 === 1;
  const isHidden = index % 7 === 3;
  const hasCounts = index % 4 !== 0;
  const hasSearchVisibility = index % 6 !== 2;
  return {
    id: `partner-${index}`,
    publicId: `RC-SYN-${index}`,
    displayName:
      index === 0
        ? longPartnerName
        : `Синтетический партнёр ${index} · ${kind.partnerType}`,
    partnerType: kind.partnerType,
    partnerKind: kind.partnerKind,
    city: kind.city,
    registrationLabel: isDemo ? "DEMO" : "ACTIVE",
    lifecycle: isHidden
      ? { catalogHiddenAt: "2026-10-20T00:00:00.000Z", projectArchivedAt: null }
      : null,
    catalogVisibility: isHidden ? "HIDDEN" : "VISIBLE",
    publicCatalogLinks:
      index % 3 === 0 ? [] : [{ label: "Карточка", path: `/partner/partner-${index}` }],
    organizations:
      index % 2 === 0
        ? [{ id: `org-${index}`, name: `Организация ${index} с длинным названием` }]
        : [],
    partnershipCounts: hasCounts
      ? {
          active: index % 9,
          invited: index % 3,
          pending: index % 2,
          paused: 0,
          ended: index % 4,
          total: index % 11,
        }
      : undefined,
    partnerSearchVisibility: hasSearchVisibility
      ? {
          visible: index % 8 !== 0,
          adminOverride: index % 10 === 0 ? "force_hidden" : null,
          reasonLabel: index % 9 === 0 ? "Скрыт администратором" : null,
        }
      : undefined,
  };
}

export const registryRows = Array.from({ length: 28 }, (_, i) => syntheticRegistryRow(i));

export const moderationQueue: ModerationQueueResponse = {
  items: [
    {
      entityKind: "user",
      id: "u-pending",
      title: longPartnerName,
      publicId: "RC-PEND",
      partnerType: "COMPANY",
      city: "Краснодар",
      catalogStatus: "PENDING",
      isTestPartner: false,
      organizationId: null,
      organizationName: null,
      updatedAt: "2026-10-28T08:00:00.000Z",
      unresolvedNotesCount: 1,
    },
    {
      entityKind: "organization",
      id: "org1",
      title: "Demo Org с длинным названием организации",
      publicId: null,
      partnerType: "COMPANY",
      city: "SPB",
      catalogStatus: "PENDING",
      isTestPartner: true,
      organizationId: "org1",
      organizationName: "Demo Org",
      updatedAt: "2026-10-27T19:00:00.000Z",
      unresolvedNotesCount: 0,
    },
  ],
  counts: { users: 1, organizations: 1, branches: 0, reviews: 0, totalPending: 2 },
};

export const sampleOrgDetail = {
  id: "org1",
  name: "Demo Org с длинным названием организации для мобильного экрана",
  partnerType: "COMPANY",
  catalogStatus: "PENDING",
  catalogPublished: false,
  ownerId: "u1",
  ownerPublicId: "pub1",
  isTestPartner: true,
  profTestPublicCatalogAllowed: false,
  pendingBranchesCount: 0,
  hasSubmittedDiff: true,
  revisionToken: "rev-org-harness",
  updatedAt: new Date().toISOString(),
  submitted: {
    description: "Описание заявки с достаточным объёмом текста для проверки переносов.",
    storeCategories: ["wallpaper"],
    specializations: ["plumbing"],
  },
  live: { catalogPublished: false },
  publicContacts: [],
  branches: [],
};

export const samplePartnerDetail: ModerationPartnerDetail = {
  id: "u-pending",
  publicId: "RC-PEND",
  partnerType: "COMPANY",
  catalogStatus: "PENDING",
  isPublic: false,
  isTestPartner: false,
  profTestPublicCatalogAllowed: null,
  rejectionReason: null,
  hasSubmittedDiff: true,
  revisionToken: "rev-partner-harness",
  updatedAt: new Date().toISOString(),
  submitted: {
    displayName: longPartnerName,
    city: "Краснодар",
    description: "Заявка партнёра с длинным описанием для проверки мобильной модерации.",
    specializations: ["plumbing"],
    storeCategories: ["wallpaper"],
  },
  live: { displayName: "Старое имя", city: "Краснодар", isPublic: false },
  portfolioItems: [],
  services: [],
  moderationNotes: [{ id: "n1", comment: "Проверить реквизиты", createdAt: "2026-10-28T07:00:00.000Z", resolvedAt: null }],
};
