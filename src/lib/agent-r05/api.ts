import { remcardFetch } from "@/lib/api-client";

export type AgentR05Status = {
  contractVersion: string;
  featureEnabled: boolean;
  hasAgentActivity: boolean;
  eligible: boolean;
  userId: string;
  ineligibleReason: string | null;
};

export type AgentReceivablesOverview = {
  contractVersion: string;
  confirmedTotalKopecks: number;
  openCount: number;
  pendingCount: number;
  coverage: {
    note: string;
    needsReviewCount: number;
    excludedFromConfirmedTotal: number;
  };
};

export type AgentReceivablePartnerGroup = {
  partnerId: string;
  groupKey: string;
  displayName: string;
  legalCaption: string;
  confirmedDebtKopecks: number;
  openCount: number;
  overdueCount: number;
  dueSoonCount: number;
  referenceOrderCount: number;
  earliestPurchaseAt: string | null;
  legalSideCount: number;
  nearestDueDate: string | null;
  r04PartnershipId: string | null;
};

export type AgentReceivableRecord = {
  accrualId: string;
  orderId: string;
  orderNumber: string;
  certificateDisplayCode: string | null;
  certificateId: string;
  partnerId: string;
  partnershipId: string | null;
  partnerDisplayName: string;
  partnerLegal: {
    name: string;
    kind: string;
    inn: string | null;
    kpp: string | null;
    snapshotNote: string | null;
    historicalRequisitesSaved: boolean;
    missingHistoricalNote: string | null;
    currentProfileName: string | null;
    currentProfileInn: string | null;
    currentProfileCaption: string | null;
  };
  clientLabel: string | null;
  purchaseAt: string;
  dueLabel: string;
  state: string;
  obligationKopecks: number;
  paidKopecks: number;
  remainingKopecks: number;
  needsReviewReason: string | null;
};

export type AgentReceivablesMeta = {
  totalRecords: number;
  confirmedTotalKopecks: number;
  selectionTotalKopecks: number;
  page: number;
  pageSize: number;
  pageCount: number;
  sort: string;
  periodField: "purchaseAt";
  periodTimezone: "UTC";
};

export type AgentReceivableOrderLine = {
  category: string;
  categoryLabel: string;
  amountBeforeDiscountKopecks: number;
  discountPercent: number;
  discountKopecks: number;
  afterDiscountKopecks: number;
  ratePercent: number | null;
  rewardKopecks: number | null;
};

export type AgentReceivableHistoryEvent = {
  at: string;
  title: string;
  note: string | null;
  amountKopecks: number | null;
  kind: string;
};

export function fetchAgentR05Status() {
  return remcardFetch<AgentR05Status>("/api/pro/r05/status");
}

export function fetchAgentReceivablesOverview() {
  return remcardFetch<AgentReceivablesOverview>("/api/pro/wallet/agent-receivables/overview");
}

export function fetchAgentReceivablePartners(params: URLSearchParams) {
  return remcardFetch<{ partners: AgentReceivablePartnerGroup[]; meta: AgentReceivablesMeta }>(
    `/api/pro/wallet/agent-receivables/partners?${params.toString()}`,
  );
}

export function fetchAgentReceivableOrders(params: URLSearchParams) {
  return remcardFetch<{ orders: AgentReceivableRecord[]; meta: AgentReceivablesMeta }>(
    `/api/pro/wallet/agent-receivables/orders?${params.toString()}`,
  );
}

export function fetchAgentReceivableOrderDetail(orderId: string) {
  return remcardFetch<{
    record: AgentReceivableRecord;
    lines: AgentReceivableOrderLine[];
    linesTotalKopecks: number;
    accrualTotalKopecks: number;
    totalsMismatch: boolean;
    history: AgentReceivableHistoryEvent[];
  }>(`/api/pro/wallet/agent-receivables/orders/${encodeURIComponent(orderId)}`);
}
