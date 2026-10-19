import type { ProProfileUser } from "@/lib/types";

export type CatalogDisplayNameSource = "staged_draft" | "live_public" | "working_profile";

/** Matches navigator GET `resolveUserCatalogDisplayNameForGet` (uses provenance, not string compare). */
export function catalogPublicNameFromGetUser(user: ProProfileUser): string {
  const source = user.catalogDisplayNameSource ?? "live_public";
  if (source === "working_profile") {
    return (user.displayName ?? "").trim();
  }
  return (user.catalogDisplayName ?? user.displayName ?? "").trim();
}
