import type { AccrualRow, HistoryFilters, PurchaseRow } from "@/lib/history-types";

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  search: "",
  status: "",
  dateFrom: "",
  dateTo: "",
  direction: "all",
};

function matchesSearch(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return text.toLowerCase().includes(q);
}

function inDateRange(isoDate: string, from: string, to: string): boolean {
  const ts = new Date(isoDate).getTime();
  if (from) {
    const fromTs = new Date(from).setHours(0, 0, 0, 0);
    if (ts < fromTs) {
      return false;
    }
  }
  if (to) {
    const toTs = new Date(to).setHours(23, 59, 59, 999);
    if (ts > toTs) {
      return false;
    }
  }
  return true;
}

export function filterPurchases(rows: PurchaseRow[], filters: HistoryFilters): PurchaseRow[] {
  return rows.filter((row) => {
    if (filters.direction !== "all" && row.direction !== filters.direction) {
      return false;
    }
    if (filters.status && row.orderStatus !== filters.status) {
      return false;
    }
    if (!inDateRange(row.createdAt, filters.dateFrom, filters.dateTo)) {
      return false;
    }
    const haystack = [row.id, row.orderId, row.promoCode, row.partnerName, row.clientName]
      .filter(Boolean)
      .join(" ");
    return matchesSearch(haystack, filters.search);
  });
}

export function filterAccruals(rows: AccrualRow[], filters: HistoryFilters): AccrualRow[] {
  return rows.filter((row) => {
    if (filters.status && row.status !== filters.status) {
      return false;
    }
    if (!inDateRange(row.createdAt, filters.dateFrom, filters.dateTo)) {
      return false;
    }
    const haystack = [row.id, row.promoCode, row.counterpartyName].filter(Boolean).join(" ");
    return matchesSearch(haystack, filters.search);
  });
}

export function purchaseStatusOptions(rows: PurchaseRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.orderStatus) {
      set.add(row.orderStatus);
    }
  }
  return Array.from(set).sort();
}

export function accrualStatusOptions(rows: AccrualRow[]): string[] {
  return Array.from(new Set(rows.map((row) => row.status))).sort();
}
