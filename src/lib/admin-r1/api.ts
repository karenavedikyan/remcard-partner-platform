import { remcardFetch } from "@/lib/api-client";

export type AdminR1ClientItem = {
  id: string;
  publicId: string | null;
  displayName: string | null;
  city: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  referredByPartner: {
    id: string;
    displayName: string | null;
    partnerKind: string | null;
    partnerKindLabel: string | null;
  } | null;
  consentPersonalData: boolean;
  archived: boolean;
};

export type AdminR1ClientsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: AdminR1ClientItem[];
  definitions: { source: string; note: string };
};

export async function fetchAdminR1Clients(params: URLSearchParams) {
  return remcardFetch<AdminR1ClientsResponse>(`/api/pro/admin/clients?${params.toString()}`);
}

export type AdminR1DealItem = {
  id: string;
  createdAt: string;
  totalAmount: number;
  discountAmount: number;
  proBonus: number;
  status: string;
  isSelfScan: boolean;
  flagged: boolean;
  certificateId: string;
  issuer: { id: string; displayName: string | null; partnerKindLabel: string | null };
  store: { id: string; displayName: string | null; partnerKindLabel: string | null };
};

export type AdminR1DealsResponse = {
  total: number;
  page: number;
  pageSize: number;
  sumAmount: number;
  items: AdminR1DealItem[];
  definitions: { entity: string; note: string };
};

export async function fetchAdminR1Deals(params: URLSearchParams) {
  return remcardFetch<AdminR1DealsResponse>(`/api/pro/admin/deals?${params.toString()}`);
}

export type AdminR1TeamMember = {
  id: string;
  publicId: string | null;
  displayName: string | null;
  staffRole: "OWNER" | "ADMIN" | "OPERATOR" | "ANALYST";
  staffPosition: string | null;
  createdAt: string;
};

export async function fetchAdminR1Team() {
  return remcardFetch<{ members: AdminR1TeamMember[] }>("/api/pro/admin/team");
}

export type AdminR1JournalItem = {
  id: string;
  createdAt: string;
  action: string;
  actorDisplayName: string | null;
  targetUserId: string | null;
};

export async function fetchAdminR1Journal(params: URLSearchParams) {
  return remcardFetch<{
    total: number;
    page: number;
    pageSize: number;
    items: AdminR1JournalItem[];
    definitions: { source: string; note: string };
  }>(`/api/pro/admin/journal?${params.toString()}`);
}

export type AdminR1PartnerCard = {
  id: string;
  publicId: string | null;
  displayName: string | null;
  city: string | null;
  partnerKind: string | null;
  partnerKindLabel: string | null;
  registrationLabel: "ACTIVE" | "DEMO";
  catalogStatus: string;
  isPublic: boolean;
  lifecycle: {
    catalogHiddenAt: string | null;
    projectArchivedAt: string | null;
    partnerSearchVisibleOverride: boolean | null;
  };
  remScore: { score: number; grade: string; updatedAt: string } | null;
  counts: {
    certificatesIssued: number;
    ordersAsIssuer: number;
    ordersAsStore: number;
    reviewsPublished: number;
    reviewsPending: number;
    activeServices: number;
  };
  createdAt: string;
  lastActiveAt: string | null;
  availableActions: string[];
};

export async function fetchAdminR1PartnerCard(userId: string) {
  return remcardFetch<AdminR1PartnerCard>(
    `/api/pro/admin/partners/${encodeURIComponent(userId)}/card`,
  );
}

export type AdminR1ResultsSummary = {
  periodDays: number;
  certificatesIssued: number;
  certificatesUsedFully: number;
  ordersCount: number;
  ordersSum: number;
  reviewsPublished: number;
  reviewsPending: number;
  averagePublishedRating: number | null;
  definitions: { certificate: string; order: string; note: string };
};

export async function fetchAdminR1ResultsSummary(periodDays = 30) {
  return remcardFetch<AdminR1ResultsSummary>(
    `/api/pro/admin/results/summary?periodDays=${periodDays}`,
  );
}

export type AdminR1RemScoreRow = {
  id: string;
  displayName: string | null;
  city: string | null;
  partnerKind: string | null;
  partnerKindLabel: string | null;
  score: number | null;
  grade: string | null;
  avgRating: number | null;
  reviewCount: number | null;
};

export async function fetchAdminR1RemScores(params: URLSearchParams) {
  return remcardFetch<{
    total: number;
    page: number;
    pageSize: number;
    averageScore: number | null;
    gradeBuckets: { A: number; B: number; C: number };
    items: AdminR1RemScoreRow[];
    definitions: { formula: string; note: string };
  }>(`/api/pro/admin/results/remscore?${params.toString()}`);
}

export type AdminR1ReviewItem = {
  id: string;
  rating: number;
  text: string;
  status: string;
  createdAt: string;
  author: { id: string; displayName: string | null };
  partner: { id: string; displayName: string | null };
  /** Present for REJECTED rows when PartnerAdminAuditEvent reason was found. */
  rejectionReason?: string | null;
};

export async function fetchAdminR1Reviews(params: URLSearchParams) {
  return remcardFetch<{
    total: number;
    page: number;
    pageSize: number;
    counts: { pending: number; published: number; rejected: number };
    rejectionReasonSource?: string;
    reviews: AdminR1ReviewItem[];
  }>(`/api/pro/admin/moderation/reviews?${params.toString()}`);
}

export async function approveAdminR1Review(reviewId: string) {
  return remcardFetch<{ success?: boolean }>(
    `/api/pro/admin/moderation/reviews/${encodeURIComponent(reviewId)}/approve`,
    { method: "POST", body: {} },
  );
}

export type AdminR1RejectReviewResult = {
  success?: boolean;
  reasonAccepted?: boolean;
  reasonPersisted?: boolean;
  reasonLength?: number;
  auditAction?: string;
  auditTargetUserId?: string;
};

export async function rejectAdminR1Review(reviewId: string, reason: string) {
  return remcardFetch<AdminR1RejectReviewResult>(
    `/api/pro/admin/moderation/reviews/${encodeURIComponent(reviewId)}/reject`,
    { method: "POST", body: { reason } },
  );
}

export type AdminR1CertificateList = {
  certificates: Array<{
    id: string;
    status: string;
    createdAt: string;
    proUser: { id: string; displayName: string | null; name?: string | null } | null;
    clientUser: { displayName: string | null } | null;
    orders: { id: string }[];
  }>;
  total: number;
  page: number;
  pageSize?: number;
  totalPages: number;
  periodDays?: number | null;
};

export async function fetchAdminR1Certificates(params: URLSearchParams) {
  return remcardFetch<AdminR1CertificateList>(
    `/api/pro/admin/certificates?${params.toString()}`,
  );
}

export type AdminR1AnalyticsPayload = {
  tab?: string;
  period?: string;
  visitors?: { current: number; previous: number; changePercent: number };
  registrations?: { current: number; previous: number; changePercent: number };
  requests?: { current: number; previous: number; changePercent: number };
  conversionPercent?: number;
  catalogViews?: number;
  profileViews?: number;
  approvedPartners?: number;
  activeServices?: number;
  alignedPartnerMetrics?: {
    liveRegistered?: number;
    visibleInCatalog?: number;
    demoRegistered?: number;
    catalogCardSurfaces?: number;
  };
  partnersByType?: Record<string, number>;
  visitsBySection?: unknown[];
  registrationsByDay?: unknown[];
  requestsByDay?: unknown[];
  [key: string]: unknown;
};

export async function fetchAdminR1Analytics(period = "30d", tab = "overview") {
  const q = new URLSearchParams({ period, tab });
  return remcardFetch<AdminR1AnalyticsPayload>(`/api/pro/admin/analytics?${q.toString()}`);
}

/** Adapter: prefer registry partnerKind; never invent includes("AGENT") classifier. */
export function adminR1PartnerKindLabel(
  partnerKind: string | null | undefined,
  fallbackPartnerType?: string | null,
): string {
  if (partnerKind === "agent") return "Агент";
  if (partnerKind === "specialist") return "Специалист";
  if (partnerKind === "store") return "Магазин";
  if (partnerKind === "company") return "Компания";
  if (fallbackPartnerType === "MASTER") return "Специалист";
  if (fallbackPartnerType === "STORE") return "Магазин";
  if (fallbackPartnerType === "COMPANY") return "Компания";
  return "Партнёр";
}

export function formatAdminR1Money(n: number): string {
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}

export function formatAdminR1Date(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
