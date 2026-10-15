import type { AgentCertificatePartnerOffer, AgentCertificateRow } from "./types";
import { formatDiscountPercent } from "./formatDiscountPercent";

export function certificatePartnerSummary(cert: AgentCertificateRow): string {
  const first = cert.partnerOffers?.[0];
  const firstCat = first?.categories?.[0];
  if (first && firstCat) {
    const cats =
      cert.categorySummary ??
      first.categories.map((c) => c.categoryLabel).join(', ');
    const extraPartners =
      cert.partnerCount > 1 ? ` · +${cert.partnerCount - 1} партнёра` : '';
    return `${first.storeName} · ${cats}${extraPartners}`;
  }
  if (cert.partnerStoreName && cert.categorySummary) {
    return `${cert.partnerStoreName} · ${cert.categorySummary}`;
  }
  return cert.directionLabel ?? cert.partnerStoreName ?? '—';
}

export function certificateListDetail(cert: AgentCertificateRow): string {
  if (cert.partnerOffers?.length) {
    return cert.partnerOffers
      .flatMap((offer) =>
        offer.categories.map(
          (cat) =>
            `${offer.storeName}: ${cat.categoryLabel} ${formatDiscountPercent(cat.discountPercent)}%`,
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
