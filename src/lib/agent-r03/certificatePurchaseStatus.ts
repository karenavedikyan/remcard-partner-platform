import type { AgentCertificateRow } from "./types";
import { certificateStatusLabel } from "@/lib/certificate-labels";

const PURCHASE_INACTIVE_STATUSES = new Set(["CANCELLED", "EXPIRED", "USED_FULLY"]);

/** Purchase fact for list/card badge (reference `hasOperations` / «Есть покупки»). */
export function certificatePurchaseStatusLabel(cert: AgentCertificateRow): string {
  if (PURCHASE_INACTIVE_STATUSES.has(cert.status)) {
    return certificateStatusLabel(cert.status);
  }
  if (cert.hasOrders) return "Есть покупки";
  return "Ожидает покупки";
}

/** Lifecycle status kept separate from purchase-state badge (e.g. «Активен»). */
export function certificateLifecycleStatusLabel(cert: AgentCertificateRow): string {
  return certificateStatusLabel(cert.status);
}
