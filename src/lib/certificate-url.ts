import type { StoreCertificate } from "@/lib/certificate-types";

export function getCertificatePublicBaseUrl(): string | null {
  const fromEnv =
    process.env.NEXT_PUBLIC_CERTIFICATE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_REMCARD_PUBLIC_URL?.trim();
  return fromEnv ? fromEnv.replace(/\/+$/, "") : null;
}

export function resolveCertificatePageUrl(cert: {
  certificateUrl?: string | null;
  qrCode?: string | null;
}): string {
  const direct = cert.certificateUrl?.trim();
  if (direct) {
    return direct;
  }
  const base = getCertificatePublicBaseUrl();
  const code = cert.qrCode?.trim();
  if (base && code) {
    return `${base}/certificate/${encodeURIComponent(code)}`;
  }
  return "";
}

export function isTestCertificateUrl(url: string): boolean {
  if (!url) {
    return true;
  }
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "pro.remcard.ru" ||
      host.endsWith(".local")
    );
  } catch {
    return true;
  }
}

export function getCertificateCodeForApi(cert: {
  promoCode?: string | null;
  qrCode?: string | null;
}): string {
  const promo = cert.promoCode?.trim();
  if (promo) {
    return promo;
  }
  return cert.qrCode?.trim() ?? "";
}

export function buildCertificatePdfProxyPath(cert: {
  promoCode?: string | null;
  qrCode?: string | null;
}): string {
  const code = getCertificateCodeForApi(cert);
  if (!code) {
    return "";
  }
  return `/api/remcard/api/certificate/${encodeURIComponent(code)}/pdf`;
}

export function certificateDisplayTitle(cert: StoreCertificate): string {
  const names = cert.storeNames?.filter(Boolean);
  if (names && names.length > 0) {
    return names.join(", ");
  }
  const partnerNames = cert.partners?.map((p) => p.storeName).filter(Boolean);
  if (partnerNames && partnerNames.length > 0) {
    return partnerNames.join(", ");
  }
  return "Рекомендация";
}

export function clientVisibleDiscountSummary(cert: StoreCertificate): string {
  const percents = new Set<number>();
  for (const partner of cert.partners ?? []) {
    for (const cat of partner.categories ?? []) {
      if (Number.isFinite(cat.discountPercent)) {
        percents.add(Math.round(cat.discountPercent));
      }
    }
  }
  if (percents.size === 0 && cert.discountPercent != null) {
    return `${cert.discountPercent}%`;
  }
  if (percents.size === 0) {
    return "—";
  }
  return Array.from(percents)
    .sort((a, b) => a - b)
    .map((p) => `${p}%`)
    .join(", ");
}
