import type { StoreCertificate } from "@/lib/certificate-types";
import type { OrderPreviewAllowed } from "@/lib/order-types";

/** Maps store order preview into the shape expected by issued preview / card builders. */
export function orderPreviewToStoreCertificate(
  preview: OrderPreviewAllowed,
  operationCode: string,
): StoreCertificate {
  const policy =
    preview.partner.recipientPolicy ?? preview.certificate.recipientPolicy ?? null;

  const categories = preview.availableCategories.map((cat) => ({
    category: cat.category,
    categoryLabel: cat.categoryLabel,
    discountPercent: cat.discountPercent,
    issuerPercent: cat.issuerPercent,
  }));

  const createdAt =
    preview.certificate.createdAt?.trim() || new Date().toISOString();

  const validUntil = policy?.validUntil ?? preview.certificate.validUntil;
  const usageCount = policy?.consumedUses ?? preview.certificate.usageCount;
  const maxUsages = policy
    ? policy.purchaseLimit > 0
      ? policy.purchaseLimit
      : 0
  : preview.certificate.maxUsages;

  return {
    id: preview.certificate.id,
    promoCode: preview.certificate.promoCode,
    qrCode: operationCode.trim(),
    status: preview.certificate.status,
    validUntil,
    maxUsages,
    usageCount,
    createdAt,
    partners: [
      {
        id: preview.partner.id,
        storeUserId: preview.partner.storeUserId,
        storeName: preview.partner.storeName,
        partnershipId: null,
        isSelfScan: preview.partner.isSelfScan,
        categories,
        recipientPolicy: policy ?? undefined,
      },
    ],
    clientUser: preview.certificate.userAlias
      ? { displayName: preview.certificate.userAlias }
      : null,
  };
}