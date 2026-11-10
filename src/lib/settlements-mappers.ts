import type { AccrualRow, AccrualScope } from "./history-types";
import type {
  SettlementCompleted,
  SettlementObligation,
  SettlementPartnerGroup,
  SettlementsResponse,
} from "./settlements-types";

/** Group open obligations by stable counterparty user id (not display name). */
export function groupObligationsByCounterparty(
  rows: SettlementObligation[],
): SettlementPartnerGroup[] {
  const groups = new Map<string, SettlementPartnerGroup>();

  for (const row of rows) {
    const existing = groups.get(row.counterpartyId);
    if (existing) {
      existing.items.push(row);
      existing.totalAmount += row.amount;
      if (row.counterpartyName.trim()) {
        existing.counterpartyName = row.counterpartyName;
      }
      continue;
    }
    groups.set(row.counterpartyId, {
      counterpartyId: row.counterpartyId,
      counterpartyName: row.counterpartyName,
      totalAmount: row.amount,
      items: [row],
    });
  }

  return [...groups.values()].sort((a, b) =>
    a.counterpartyName.localeCompare(b.counterpartyName, "ru"),
  );
}

export function sumObligationAmounts(rows: SettlementObligation[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

export function completedDirectionLabel(direction: SettlementCompleted["direction"]): string {
  return direction === "receivable" ? "Получено" : "Выплачено";
}

function promoFromBasis(basis: string): string | null {
  const match = /^Сертификат\s+(.+)$/.exec(basis.trim());
  return match?.[1]?.trim() ?? null;
}

function mapSettlementRowToAccrual(
  row: SettlementObligation | SettlementCompleted,
  scope: AccrualScope,
): AccrualRow {
  const paidAt = "paidAt" in row ? row.paidAt : null;
  return {
    id: row.id,
    orderId: row.orderId,
    accrualType: row.accrualType,
    createdAt: row.createdAt,
    amount: row.amount,
    status: row.status,
    paidAt,
    counterpartyName: row.counterpartyName,
    promoCode: promoFromBasis(row.basis),
    isSelfScan: false,
    walletRole: null,
    scope,
    items: [],
    pendingAmount: row.pendingAmount,
    suspendedAmount: row.suspendedAmount,
    paidAmount: row.paidAmount,
    confirmationLabel: row.confirmationLabel ?? null,
    confirmationAt: row.confirmationAt ?? null,
    hasIndividualTerms: row.hasIndividualTerms,
  };
}

function settlementLifecyclePresent(row: AccrualRow): boolean {
  return (
    row.pendingAmount != null ||
    row.suspendedAmount != null ||
    row.paidAmount != null ||
    row.confirmationLabel != null ||
    row.confirmationAt != null
  );
}

/** Prefer settlement bucket metadata over wallet flat amount when ids collide. */
export function mergeSettlementLifecycleIntoAccrual(
  primary: AccrualRow,
  settlement: AccrualRow,
): AccrualRow {
  if (!settlementLifecyclePresent(settlement)) {
    return primary;
  }
  return {
    ...primary,
    amount: settlement.amount,
    status: settlement.status,
    paidAt: settlement.paidAt ?? primary.paidAt,
    pendingAmount: settlement.pendingAmount,
    suspendedAmount: settlement.suspendedAmount,
    paidAmount: settlement.paidAmount,
    confirmationLabel: settlement.confirmationLabel,
    confirmationAt: settlement.confirmationAt,
    hasIndividualTerms: settlement.hasIndividualTerms,
    counterpartyName: settlement.counterpartyName || primary.counterpartyName,
    promoCode: settlement.promoCode ?? primary.promoCode,
    scope: primary.scope !== "unknown" ? primary.scope : settlement.scope,
  };
}

/** Merge settlement obligations into accrual rows for detail pages (both wallet directions). */
export function mapSettlementsToAccrualRows(data: SettlementsResponse): AccrualRow[] {
  const receivable = data.receivable.map((row) =>
    mapSettlementRowToAccrual(row, "earned"),
  );
  const payable = data.payable.map((row) =>
    mapSettlementRowToAccrual(row, "payable-to-pros"),
  );
  const completed = data.completed.map((row) =>
    mapSettlementRowToAccrual(
      row,
      row.direction === "receivable" ? "earned" : "payable-to-pros",
    ),
  );
  return [...receivable, ...payable, ...completed];
}

export function mergeAccrualRowsById(
  primary: AccrualRow[],
  supplemental: AccrualRow[],
): AccrualRow[] {
  const byId = new Map<string, AccrualRow>();
  for (const row of primary) {
    byId.set(`${row.accrualType}:${row.id}`, row);
  }
  for (const row of supplemental) {
    const key = `${row.accrualType}:${row.id}`;
    const existing = byId.get(key);
    if (existing) {
      byId.set(key, mergeSettlementLifecycleIntoAccrual(existing, row));
    } else {
      byId.set(key, row);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
