import type { ProProfileUser } from "@/lib/types";

export type CatalogDisplayNameSource = "staged_draft" | "live_public" | "working_profile";

/** Matches navigator GET `resolveUserCatalogDisplayNameForGet` (uses provenance, not string compare). */
export function catalogPublicNameFromGetUser(user: ProProfileUser): string {
  const source = user.catalogDisplayNameSource;
  if (source === "working_profile") {
    return (user.displayName ?? "").trim();
  }
  if (source === "staged_draft") {
    if (user.catalogDisplayName == null) return "";
    return String(user.catalogDisplayName).trim();
  }
  // live_public or legacy GET without provenance
  return (user.catalogDisplayName ?? user.displayName ?? "").trim();
}
