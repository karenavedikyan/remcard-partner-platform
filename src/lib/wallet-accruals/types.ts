import type { SettlementCompleted, SettlementObligation } from "@/lib/settlements-types";

export type WalletDirection = "in" | "out";

export type WalletHistoryFilter = "all" | "waiting" | "received" | "paid";

export type WalletHistoryRowKind =
  | "waiting"
  | "confirmed"
  | "suspended"
  | "received"
  | "paid-out"
  | "return";

export type WalletHistoryRow = {
  rowKey: string;
  lineId: string;
  direction: WalletDirection;
  kind: WalletHistoryRowKind;
  amount: number;
  sortDate: string;
  category: string;
  partner: string;
  purchaseId: string;
  suspendedReason?: string | null;
  source: SettlementObligation | SettlementCompleted;
};

export type WalletTxnView = {
  lineId: string;
  rowKind: WalletHistoryRowKind;
  amount: number;
  sortDate: string;
  paidAt?: string;
};

export type WalletCardTotals = {
  confirmedUnpaid: number;
  waiting: number;
};

export type WalletAccrualsData = {
  receivable: SettlementObligation[];
  payable: SettlementObligation[];
  completed: SettlementCompleted[];
};

export type WalletPresentation = {
  ribbonLabel: string;
  cardIdentifier: string | null;
};
