import type { PartnershipUiAction } from "@/lib/partnership-rules";

/** Maps partnership UI action kinds to RecordRowActions icon ids (R04 list/cards). */
export function partnershipActionIconId(kind: PartnershipUiAction["kind"] | "details" | "more"): string {
  switch (kind) {
    case "accept":
    case "accept_pending":
      return "accept";
    case "reject":
      return "reject";
    case "pause":
      return "pause";
    case "resume":
      return "resume";
    case "cancel":
    case "withdraw_counter":
      return "revoke";
    case "details":
      return "open";
    case "more":
      return "more";
    default:
      return "open";
  }
}
