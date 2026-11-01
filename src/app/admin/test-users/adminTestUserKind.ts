export type ProfTestUserCreateKind = "agent" | "master" | "store" | "company";

export const PROF_TEST_USER_KIND_LABEL: Record<ProfTestUserCreateKind, string> = {
  agent: "Агент",
  master: "Специалист",
  store: "Магазин",
  company: "Компания",
};

/** Mirrors backend applyProfTestPartnerKind — used for list/filter labels, not permissions. */
export function profTestUserCreateKind(input: {
  partnerType: string | null;
  partnerActivities: string[];
}): ProfTestUserCreateKind | null {
  const act = input.partnerActivities?.[0]?.toUpperCase() ?? "";
  const pt = input.partnerType?.toUpperCase() ?? "";
  if (act === "AGENT") return "agent";
  if (pt === "STORE" || act === "STORE") return "store";
  if (pt === "MASTER") return "master";
  if (pt === "COMPANY" && act === "SERVICE") return "company";
  return null;
}

export function profTestUserKindLabel(input: {
  partnerType: string | null;
  partnerActivities: string[];
}): string {
  const kind = profTestUserCreateKind(input);
  if (kind) return PROF_TEST_USER_KIND_LABEL[kind];
  return input.partnerActivities?.join(", ") || input.partnerType || "—";
}

export type ProfTestUserListRow = {
  displayName: string;
  publicId: string;
  partnerType: string | null;
  partnerActivities: string[];
  profTestDisabledAt: string | null;
};

export function filterProfTestUsers<T extends ProfTestUserListRow>(
  items: T[],
  filters: {
    query: string;
    stateFilter: "all" | "active" | "disabled";
    kindFilter: "all" | ProfTestUserCreateKind;
  },
): T[] {
  const q = filters.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filters.stateFilter === "active" && item.profTestDisabledAt) return false;
    if (filters.stateFilter === "disabled" && !item.profTestDisabledAt) return false;
    if (filters.kindFilter !== "all" && profTestUserCreateKind(item) !== filters.kindFilter) return false;
    if (!q) return true;
    const kindText = profTestUserKindLabel(item).toLowerCase();
    return (
      item.displayName.toLowerCase().includes(q) ||
      item.publicId.toLowerCase().includes(q) ||
      kindText.includes(q)
    );
  });
}
