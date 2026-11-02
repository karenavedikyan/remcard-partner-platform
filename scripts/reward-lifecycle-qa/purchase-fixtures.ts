import type { StoreCertificate } from "../../src/lib/certificate-types";
import type { AgentCertificateRow } from "../../src/lib/agent-r03/types";

export const cert: StoreCertificate = {
  id: "cqaonlycertificate00000001", promoCode: "RC-QA-ONLY", qrCode: "qa-only",
  status: "ACTIVE", validUntil: null, maxUsages: 0, usageCount: 2,
  createdAt: "2026-11-02T10:00:00Z", partners: [],
  orders: [{
    id: "cqaonlypurchase00000000001", createdAt: "2026-11-02T11:00:00Z",
    status: "CONFIRMED", totalAmount: 120000, discountAmount: 12000, proBonus: 6000,
    isSelfScan: false, certificatePartner: { storeName: "Синтетический продавец" },
    items: [{ id: "line-1", category: "qa-doors", categoryLabel: "Двери", amount: 120000,
      discountPercent: 10, discountAmount: 12000, issuerPercent: 5, issuerAmount: 6000,
      proBonusPercent: 0, proBonusAmount: 0 }],
  }, {
    id: "cqaonlypurchase00000000002", createdAt: "2026-11-02T12:00:00Z",
    status: "CANCELLED", totalAmount: 57000, discountAmount: 2850, proBonus: 5700,
    isSelfScan: false, certificatePartner: { storeName: "Синтетическая компания" },
    items: [{ id: "line-2", category: "qa-floor", categoryLabel: "Напольные покрытия", amount: 57000,
      discountPercent: 5, discountAmount: 2850, issuerPercent: null, issuerAmount: null,
      proBonusPercent: 4, proBonusAmount: 2280, agentBonusPercent: 6, agentBonusAmount: 3420 }],
  }],
};
export const meta: AgentCertificateRow = {
  id: cert.id, promoCode: cert.promoCode, displayCode: "A-RC-QA-ONLY", qrCode: cert.qrCode,
  status: "ACTIVE", validUntil: null, maxUsages: 0, usageCount: 2, createdAt: cert.createdAt,
  userAlias: "Только синтетический сертификат", title: "Двери",
  directionLabel: "Двери", partnerStoreName: "Синтетический продавец", partnerCount: 2,
  categorySummary: "Двери, Напольные покрытия", partnerOffers: [], terms: [],
  discountPercent: 10, archivedInWorkspace: false, hasOrders: true,
  agentClient: { id: "qa-only-client", displayName: "Синтетический клиент" },
  issuerKindSnapshot: "AGENT", canMutateIssuer: false,
};
export const purchaseResponse = (index: number) => {
  const order = cert.orders![index];
  return { order: {
    ...order, orderId: order.id, promoCode: cert.promoCode, payableAmount: order.totalAmount - order.discountAmount,
    clientName: meta.agentClient!.displayName, storeName: order.certificatePartner!.storeName,
    proName: "Синтетический рекомендатель", branchId: null, branchName: null,
    executorName: "Синтетический продавец", linkedAccruals: [],
    items: order.items.map(item => ({ ...item,
      issuerPercent: item.issuerPercent ?? item.proBonusPercent + (item.agentBonusPercent ?? 0),
      issuerAmount: item.issuerAmount ?? item.proBonusAmount + (item.agentBonusAmount ?? 0),
    })),
  } };
};
