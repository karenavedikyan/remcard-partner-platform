import type { AgentCertificatePartnerOffer, AgentCertificateRow } from "./types";

export function formatOfferLine(offer: AgentCertificatePartnerOffer): string[] {
  return offer.categories.map(
    (cat) => `${cat.categoryLabel} — скидка ${cat.discountPercent}%`,
  );
}

export function certificateListDetail(cert: AgentCertificateRow): string {
  if (cert.partnerOffers?.length) {
    return cert.partnerOffers
      .flatMap((offer) =>
        offer.categories.map(
          (cat) => `${offer.storeName}: ${cat.categoryLabel} ${cat.discountPercent}%`,
        ),
      )
      .join(" · ");
  }
  if (cert.partnerStoreName && cert.categorySummary) {
    return `${cert.partnerStoreName} · ${cert.categorySummary}`;
  }
  return cert.partnerStoreName ?? cert.categorySummary ?? cert.directionLabel ?? "—";
}

export function certificateUsageCaption(cert: AgentCertificateRow): string {
  const lines: string[] = [];
  if (cert.partnerOffers?.length) {
    for (const offer of cert.partnerOffers) {
      for (const cat of offer.categories) {
        lines.push(`${offer.storeName}: ${cat.categoryLabel} ${cat.discountPercent}%`);
      }
    }
  } else if (cert.discountPercent > 0) {
    lines.push(`Скидка ${cert.discountPercent}%`);
  }
  if (cert.partnerCount > 1) {
    lines.push(`${cert.partnerCount} партнёра`);
  }
  return lines.length ? lines.join(" · ") : "Условия уточняются в карточке";
}
