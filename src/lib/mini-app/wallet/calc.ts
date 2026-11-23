import type { SettlementObligation } from "@/lib/settlements-types";
import {
  addKopecks,
  confirmedUnpaidKopecks,
  kopecksToRub,
  rubToKopecks,
  suspendedKopecks,
  waitingKopecks,
} from "@/lib/wallet-accruals/amounts";
import {
  walletDetailTabCounts,
  walletDetailTabRows,
  walletScheduleRows,
} from "@/lib/wallet-accruals/detail-buckets";
import { formatPurchaseRef } from "@/lib/wallet-accruals/format";
import {
  buildWalletHistoryRows,
  sumHistoryRowAmountsKopecks,
} from "@/lib/wallet-accruals/map-history";
import { toAccrualsData } from "@/lib/wallet-accruals/settlements-display";
import type { WalletAccrualsData, WalletDirection, WalletHistoryRow } from "@/lib/wallet-accruals/types";
import type { SettlementsResponse } from "@/lib/settlements-types";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import { sanitizeMiniAppWalletSettlements } from "./sanitize";

export type MiniWalletFilter =
  | "all"
  | "confirmed"
  | "waiting"
  | "suspended"
  | "paid"
  | "schedule";

export type MiniWalletStatusTotals = {
  confirmedRub: number;
  waitingRub: number;
  suspendedRub: number;
  paidRub: number;
  confirmedCount: number;
  waitingCount: number;
  suspendedCount: number;
  paidCount: number;
  allCount: number;
};

export type MiniWalletPartnerLine = {
  lineId: string;
  label: string;
  purchaseId: string;
  amountRub: number;
  kind: WalletHistoryRow["kind"];
  sortDate: string | null;
  suspendedNote: string | null;
};

export type MiniWalletPartnerGroup = {
  counterpartyId: string;
  counterpartyName: string;
  totalRub: number;
  lines: MiniWalletPartnerLine[];
};

export type MiniWalletDirectionCalc = {
  totals: MiniWalletStatusTotals;
  partnerGroups: MiniWalletPartnerGroup[];
  scheduleCount: number;
};

export type MiniWalletCalc = {
  incomingOnly: boolean;
  in: MiniWalletDirectionCalc;
  out: MiniWalletDirectionCalc;
};

export function miniWalletIncomingOnly(role: MiniAppBootstrap["role"]): boolean {
  return role === "agent";
}

export function miniWalletAccrualsFromResponse(
  response: SettlementsResponse,
  role: MiniAppBootstrap["role"],
): WalletAccrualsData {
  const sanitized = sanitizeMiniAppWalletSettlements(response, miniWalletIncomingOnly(role));
  return toAccrualsData(sanitized);
}

function sumOpenSourceKopecks(rows: SettlementObligation[]): {
  confirmedK: number;
  waitingK: number;
  suspendedK: number;
} {
  let confirmedK = 0;
  let waitingK = 0;
  let suspendedK = 0;
  for (const row of rows) {
    confirmedK += confirmedUnpaidKopecks(row);
    waitingK += waitingKopecks(row);
    suspendedK += suspendedKopecks(row);
  }
  return { confirmedK, waitingK, suspendedK };
}

function historyRowsForFilter(
  data: WalletAccrualsData,
  direction: WalletDirection,
  filter: MiniWalletFilter,
  incomingOnly: boolean,
): WalletHistoryRow[] {
  if (filter === "schedule") {
    return walletScheduleRows(data, direction).map((s) => s.historyRow);
  }
  if (filter === "confirmed") {
    return walletDetailTabRows(data, direction, "confirmed", incomingOnly);
  }
  if (filter === "waiting") {
    return walletDetailTabRows(data, direction, "waiting", incomingOnly);
  }
  if (filter === "suspended") {
    return walletDetailTabRows(data, direction, "suspended", incomingOnly);
  }
  if (filter === "paid") {
    return walletDetailTabRows(data, direction, "paid", incomingOnly);
  }
  return buildWalletHistoryRows(data, direction, incomingOnly).filter((r) => r.kind !== "return");
}

function partnerGroupsFromHistoryRows(rows: WalletHistoryRow[]): MiniWalletPartnerGroup[] {
  const byPartner = new Map<string, MiniWalletPartnerGroup>();
  for (const row of rows) {
    const source = row.source;
    const counterpartyId = source.counterpartyId;
    const counterpartyName = row.partner || source.counterpartyName;
    const line: MiniWalletPartnerLine = {
      lineId: row.lineId,
      label: row.category,
      purchaseId: row.purchaseId || formatPurchaseRef(source.orderId),
      amountRub: row.amount,
      kind: row.kind,
      sortDate: row.sortDate?.trim() ? row.sortDate : null,
      suspendedNote: row.suspendedReason ?? null,
    };
    const existing = byPartner.get(counterpartyId);
    if (existing) {
      existing.lines.push(line);
      existing.totalRub = kopecksToRub(
        addKopecks([rubToKopecks(existing.totalRub), rubToKopecks(line.amountRub)]),
      );
      continue;
    }
    byPartner.set(counterpartyId, {
      counterpartyId,
      counterpartyName,
      totalRub: line.amountRub,
      lines: [line],
    });
  }
  return [...byPartner.values()].sort((a, b) =>
    a.counterpartyName.localeCompare(b.counterpartyName, "ru"),
  );
}

function directionCalc(
  data: WalletAccrualsData,
  direction: WalletDirection,
  filter: MiniWalletFilter,
  incomingOnly: boolean,
): MiniWalletDirectionCalc {
  const openSource = direction === "in" ? data.receivable : data.payable;
  const sums = sumOpenSourceKopecks(openSource);
  const tabCounts = walletDetailTabCounts(data, direction, incomingOnly);
  const paidRows = walletDetailTabRows(data, direction, "paid", incomingOnly);
  const paidRub = kopecksToRub(sumHistoryRowAmountsKopecks(paidRows));
  const allRows = buildWalletHistoryRows(data, direction, incomingOnly).filter(
    (r) => r.kind !== "return",
  );
  const schedule = walletScheduleRows(data, direction);
  const partnerGroups = partnerGroupsFromHistoryRows(
    historyRowsForFilter(data, direction, filter, incomingOnly),
  );
  return {
    totals: {
      confirmedRub: kopecksToRub(sums.confirmedK),
      waitingRub: kopecksToRub(sums.waitingK),
      suspendedRub: kopecksToRub(sums.suspendedK),
      paidRub,
      confirmedCount: tabCounts.confirmed,
      waitingCount: tabCounts.waiting,
      suspendedCount: tabCounts.suspended,
      paidCount: tabCounts.paid,
      allCount: allRows.length,
    },
    partnerGroups,
    scheduleCount: schedule.length,
  };
}

export function computeMiniWalletCalc(
  response: SettlementsResponse,
  role: MiniAppBootstrap["role"],
  activeFilter: MiniWalletFilter = "all",
): MiniWalletCalc {
  const data = miniWalletAccrualsFromResponse(response, role);
  const incomingOnly = miniWalletIncomingOnly(role);
  return {
    incomingOnly,
    in: directionCalc(data, "in", activeFilter, incomingOnly),
    out: incomingOnly
      ? {
          totals: {
            confirmedRub: 0,
            waitingRub: 0,
            suspendedRub: 0,
            paidRub: 0,
            confirmedCount: 0,
            waitingCount: 0,
            suspendedCount: 0,
            paidCount: 0,
            allCount: 0,
          },
          partnerGroups: [],
          scheduleCount: 0,
        }
      : directionCalc(data, "out", activeFilter, incomingOnly),
  };
}
