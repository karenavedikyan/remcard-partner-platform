import { displayCategoryLabel } from "@/lib/category-display";
import { masterDirectionLabel } from "@/lib/master-direction-label";
import { formatWorkingHoursShort } from "@/lib/branch-working-hours";

export function formatBranchDirectionsSummary(
  storeCategories: string[],
  specializations: string[],
): string {
  const parts: string[] = [];
  if (storeCategories.length) {
    parts.push(`Товары: ${storeCategories.slice(0, 3).map((id) => displayCategoryLabel(id)).join(", ")}`);
  }
  if (specializations.length) {
    parts.push(`Услуги: ${specializations.slice(0, 3).map((id) => masterDirectionLabel(id)).join(", ")}`);
  }
  return parts.length ? parts.join(" · ") : "Направления не указаны";
}

export { formatWorkingHoursShort };
