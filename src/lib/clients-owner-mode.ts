import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";

/** Specialist-style certificate builder/detail (recommendations) without agent program UI. */
export function ownerClientsUsesRecommendationCerts(mode: OwnerClientsAccessMode): boolean {
  return mode === "specialist" || mode === "business";
}
