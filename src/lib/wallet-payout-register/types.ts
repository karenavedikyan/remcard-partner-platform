export type WalletPayoutDirection = "in" | "out";

export type WalletPayoutPendingStatus = "waiting" | "approved" | "rejected";

export type WalletPayoutPartnerRow = {
  counterpartyId: string;
  counterpartyName: string;
  branchLabel: string | null;
  direction: WalletPayoutDirection;
  readyKopecks: number;
  pending: null | {
    requestId: string;
    amountKopecks: number;
    status: WalletPayoutPendingStatus;
  };
  lastReceipt: null | {
    amountKopecks: number;
    confirmedAt: string;
  };
};

export type WalletPayoutReceiptRow = {
  counterpartyId: string;
  counterpartyName: string;
  amountKopecks: number;
  confirmedAt: string;
  direction: WalletPayoutDirection;
};

export type WalletPayoutRegisterResponse = {
  partners: WalletPayoutPartnerRow[];
  receipts: WalletPayoutReceiptRow[];
  totals: { inKopecks: number; outKopecks: number };
  incomingOnly: boolean;
  readOnly: boolean;
  canReceive: boolean;
  canPayout: boolean;
};