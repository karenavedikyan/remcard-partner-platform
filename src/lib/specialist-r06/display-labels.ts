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

export function specialistIdListDisplay(ids: string[] | undefined): string {
  const labels = (ids ?? [])
    .map((id) => {
      const label = masterDirectionLabel(id);
      return label !== "Категория" ? label : "";
    })
    .filter(Boolean);
  return labels.length ? labels.join(", ") : "—";
}
