export type SettlementAccrualType = "bonus" | "agentBonus";

export type SettlementPayoutActions = {
  canRecordCash: boolean;
  canRecordTransfer: boolean;
};

export type SettlementObligation = {
  id: string;
  orderId: string;
  accrualType: SettlementAccrualType;
  counterpartyId: string;
  counterpartyName: string;
  amount: number;
  basis: string;
  status: string;
  createdAt: string;
  payoutActions?: SettlementPayoutActions;
};

export type SettlementCompleted = SettlementObligation & {
  paidAt: string | null;
  direction: "receivable" | "payable";
};

export type SettlementsResponse = {
  receivable: SettlementObligation[];
  payable: SettlementObligation[];
  completed: SettlementCompleted[];
  coverageNote: string;
};

export type SettlementPartnerGroup = {
  counterpartyId: string;
  counterpartyName: string;
  totalAmount: number;
  items: SettlementObligation[];
  /** No open rows; partner reachable via completed history when status=all. */
  completedOnly?: boolean;
};

export type SettlementsTab = "receivable" | "payable" | "completed";
