import { masterDirectionLabel } from "@/lib/master-direction-label";
import { SPECIALIST_PRESETS } from "@/lib/specialist-r06/presets";
import type { SpecialistProfileDraftPayload } from "@/lib/specialist-r06/types";

export function specialistKindDisplayLabel(
  kind: SpecialistProfileDraftPayload["specialistKind"] | string | undefined,
  customTitle?: string | null,
): string {
  const title = customTitle?.trim();
  if (kind === "other") return title || "Свой вариант";
  if (!kind) return title || "—";
  const preset = SPECIALIST_PRESETS.find((p) => p.id === kind);
  return preset?.label ?? title ?? kind;
}

/**
 * Specialization line of the saved-profile summary: the chosen role, else the selected services
 * (the same data as the direction chips). Empty string = nothing to show (the row is omitted).
 */
export function specialistSpecializationSummary(
  profile: Pick<
    SpecialistProfileDraftPayload,
    "specialistKind" | "specialistTitle" | "serviceSpecializationIds"
  >,
): string {
  if (profile.specialistKind || profile.specialistTitle?.trim()) {
    const label = specialistKindDisplayLabel(profile.specialistKind, profile.specialistTitle);
    if (label && label !== "—") return label;
  }
  return (profile.serviceSpecializationIds ?? [])
    .map((id) => masterDirectionLabel(id))
    .filter((label) => label && label !== "Категория")
    .join(", ");
}

export function specialistIdListDisplay(ids: string[] | undefined): string {
  const labels = (ids ?? [])
    .map((id) => {
      const label = masterDirectionLabel(id);
      return label !== "Категория" ? label : "";
    })
    .filter(Boolean);
  return labels.length ? labels.join(", ") : "—";
}
