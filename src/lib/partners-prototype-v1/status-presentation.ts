import type { Partnership } from "@/lib/types";
import { partnershipAgentSegment } from "@/lib/partnership-rules";
import { PARTNERSHIP_STATUS_LABELS } from "@/lib/partnership-labels";

export type PartnerRelationBucket =
  | "active"
  | "pending"
  | "discussion"
  | "archived"
  | "hidden";

export function partnershipRelationBucket(
  partnership: Partnership,
  opts?: { listVisibility?: "active" | "archive" | "hidden" },
): PartnerRelationBucket {
  if (opts?.listVisibility === "archive") return "archived";
  if (opts?.listVisibility === "hidden") return "hidden";

  const segment = partnershipAgentSegment(partnership.status);
  if (segment === "invitations") {
    // Discussed / awaiting — invitations tab
    if (
      partnership.status === "DISCUSSION" ||
      partnership.status === "DISCUSSING" ||
      Boolean(partnership.note && partnership.status === "INVITED")
    ) {
      return "discussion";
    }
    return "pending";
  }
  return "active";
}

export function partnershipRelationLabel(
  partnership: Partnership,
  opts?: { listVisibility?: "active" | "archive" | "hidden" },
): string {
  const bucket = partnershipRelationBucket(partnership, opts);
  if (bucket === "archived") return "В архиве";
  if (bucket === "hidden") return "Скрыт";
  if (bucket === "discussion") return "Обсуждается";
  if (bucket === "pending") {
    return PARTNERSHIP_STATUS_LABELS[partnership.status] ?? "Ожидает";
  }
  return PARTNERSHIP_STATUS_LABELS[partnership.status] ?? "Действует";
}
