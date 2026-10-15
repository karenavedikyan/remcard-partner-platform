/** Mirrors remcard-navigator `certificateIssuerDisplay` (display-only; promo/QR unchanged). */

import type { CertificateIssuerKindSnapshot } from "@/lib/certificate-types";

export type { CertificateIssuerKindSnapshot };

const PREFIX: Record<CertificateIssuerKindSnapshot, string> = {
  AGENT: "А",
  STORE: "М",
  COMPANY: "К",
  SPECIALIST: "С",
};

export function issuerKindDisplayPrefix(
  kind: CertificateIssuerKindSnapshot | null | undefined,
): string | null {
  if (!kind) return null;
  return PREFIX[kind] ?? null;
}

export function formatCertificateDisplayCode(
  promoCode: string,
  kind: CertificateIssuerKindSnapshot | null | undefined,
): string {
  const prefix = issuerKindDisplayPrefix(kind);
  if (!prefix) return promoCode;
  return `${prefix}-${promoCode}`;
}
