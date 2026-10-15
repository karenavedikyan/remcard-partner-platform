export type AgentR03Status = {
  contractVersion: string;
  featureEnabled: boolean;
  hasAgentActivity: boolean;
  eligible: boolean;
  userId: string;
  ineligibleReason?: string | null;
};

export type AgentClientRow = {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  note: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  certificateCount: number;
};

export type AgentCertificateRow = {
  id: string;
  promoCode: string;
  displayCode: string;
  qrCode: string;
  status: string;
  validUntil: string | null;
  maxUsages: number;
  usageCount: number;
  createdAt: string;
  certificateUrl?: string | null;
  userAlias: string | null;
  title: string;
  directionLabel: string | null;
  discountPercent: number;
  archivedInWorkspace: boolean;
  hasOrders: boolean;
  agentClient: { id: string; displayName: string } | null;
  issuerKindSnapshot: string | null;
};
