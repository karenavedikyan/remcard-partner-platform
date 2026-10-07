export type SettlementAccrualType = "bonus" | "agentBonus";

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
};

export type SettlementCompleted = SettlementObligation & {
  paidAt: string;
  direction: "receivable" | "payable";
};

export type SettlementsResponse = {
  receivable: SettlementObligation[];
  payable: SettlementObligation[];
  completed: SettlementCompleted[];
};

export type SettlementPartnerGroup = {
  counterpartyId: string;
  counterpartyName: string;
  totalAmount: number;
  items: SettlementObligation[];
};

export type SettlementsTab = "receivable" | "payable" | "completed";
