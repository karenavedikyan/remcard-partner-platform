import type { StoreCertificate } from "@/lib/certificate-types";
import type { OrderPreviewAllowed } from "@/lib/order-types";

/** Maps store order preview into the shape expected by client certificate card builders. */
export function orderPreviewToStoreCertificate(
  preview: OrderPreviewAllowed,
  operationCode: string,
): StoreCertificate {
  const categories = preview.availableCategories.map((cat) => ({
    category: cat.category,
    categoryLabel: cat.categoryLabel,
    discountPercent: cat.discountPercent,
    issuerPercent: cat.issuerPercent,
  }));

  return {
    id: preview.certificate.id,
    promoCode: preview.certificate.promoCode,
    qrCode: operationCode.trim(),
    status: preview.certificate.status,
    validUntil: preview.certificate.validUntil,
    maxUsages: preview.certificate.maxUsages,
    usageCount: preview.certificate.usageCount,
    createdAt: new Date().toISOString(),
    partners: [
      {
        id: preview.partner.id,
        storeUserId: preview.partner.id,
        storeName: preview.partner.storeName,
        partnershipId: null,
        isSelfScan: preview.partner.isSelfScan,
        categories,
      },
    ],
    clientUser: preview.certificate.userAlias
      ? { displayName: preview.certificate.userAlias }
      : null,
  };
}
