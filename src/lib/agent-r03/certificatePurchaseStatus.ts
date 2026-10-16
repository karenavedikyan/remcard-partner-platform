import type { AgentCertificateRow } from "./types";
import { certificateStatusLabel } from "@/lib/certificate-labels";

/** Purchase fact for list/card badge (reference `hasOperations` / «Есть покупки»). */
export function certificatePurchaseStatusLabel(cert: AgentCertificateRow): string {
  if (cert.hasOrders) return "Есть покупки";
  return "Ожидает покупки";
}

/** Lifecycle status kept separate from purchase-state badge (e.g. «Активен»). */
export function certificateLifecycleStatusLabel(cert: AgentCertificateRow): string {
  return certificateStatusLabel(cert.status);
}
