import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";

export function partnerTypeLabel(row: PartnerRegistryItem): string {
  if (row.partnerKind) {
    return (
      { agent: "Агент", specialist: "Специалист", store: "Магазин", company: "Компания" }[
        row.partnerKind
      ] ?? "Не указан"
    );
  }
  return (
    { MASTER: "Специалист", STORE: "Магазин", COMPANY: "Компания", AGENT: "Агент" }[
      row.partnerType ?? ""
    ] ?? "Не указан"
  );
}

export function catalogStatusLabel(row: PartnerRegistryItem): string {
  if (row.lifecycle?.projectArchivedAt) return "В архиве";
  if (row.lifecycle?.catalogHiddenAt) return "Скрыт";
  if (row.catalogVisibility === "VISIBLE") return "Виден в каталоге";
  return "Не опубликован";
}

/** Compact mobile row token derived from {@link catalogStatusLabel} rules. */
export function denseCatalogStatusToken(row: PartnerRegistryItem): "да" | "нет" | "н/д" {
  if (row.lifecycle?.projectArchivedAt) return "нет";
  if (row.lifecycle?.catalogHiddenAt) return "нет";
  if (row.catalogVisibility === "VISIBLE") return "да";
  if (row.catalogVisibility != null && String(row.catalogVisibility).length > 0) return "нет";
  return "н/д";
}

export function catalogStatusClass(
  row: PartnerRegistryItem,
  visibleClass: string,
  inactiveClass: string,
): string {
  const visible =
    !row.lifecycle?.projectArchivedAt &&
    !row.lifecycle?.catalogHiddenAt &&
    row.catalogVisibility === "VISIBLE";
  return visible ? visibleClass : inactiveClass;
}

export function filteredPublicLinks(row: PartnerRegistryItem) {
  return (row.publicCatalogLinks ?? []).filter((link) =>
    /^\/(partner\/|catalog\/org\/|catalog\/branch\/)/.test(link.path),
  );
}

export function selectedPartnerRef(row: PartnerRegistryItem) {
  return { id: row.id, displayName: row.displayName };
}
