import type { CertificateStatus } from "@/lib/certificate-types";

export const CERTIFICATE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активен",
  USED_PARTIALLY: "Частично использован",
  USED_FULLY: "Использован",
  EXPIRED: "Истёк",
  CANCELLED: "Отменён",
};

export function certificateStatusLabel(status: CertificateStatus): string {
  return CERTIFICATE_STATUS_LABELS[status] ?? status;
}

export function certificateStatusTone(
  status: CertificateStatus,
): "active" | "pending" | "declined" | "neutral" {
  switch (status) {
    case "ACTIVE":
      return "active";
    case "USED_PARTIALLY":
      return "pending";
    case "EXPIRED":
    case "CANCELLED":
    case "USED_FULLY":
      return "declined";
    default:
      return "neutral";
  }
}
