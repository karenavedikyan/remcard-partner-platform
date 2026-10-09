export type ProfileSectionId =
  | "overview"
  | "basics"
  | "branches"
  | "team"
  | "catalog"
  | "notifications";

export const PROFILE_SECTION_NAV: { id: ProfileSectionId; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "basics", label: "Основные данные" },
  { id: "catalog", label: "Каталог RemCard" },
  { id: "branches", label: "Филиалы" },
  { id: "team", label: "Сотрудники" },
  { id: "notifications", label: "Уведомления" },
];

const LEGACY_SECTION_ALIASES: Record<string, ProfileSectionId> = {
  moderation: "catalog",
};

const KNOWN_SECTIONS = new Set<ProfileSectionId>(
  PROFILE_SECTION_NAV.map((item) => item.id),
);

export type ProfileSectionQueryInput = {
  section?: string | null;
  moderation?: string | null;
  branchId?: string | null;
};

export function resolveProfileSectionFromQuery(
  input: ProfileSectionQueryInput,
): ProfileSectionId {
  const raw = input.section?.trim();
  if (raw && LEGACY_SECTION_ALIASES[raw]) {
    return LEGACY_SECTION_ALIASES[raw];
  }
  if (raw && KNOWN_SECTIONS.has(raw as ProfileSectionId)) {
    return raw as ProfileSectionId;
  }
  if (input.branchId?.trim()) {
    return "branches";
  }
  if (input.moderation === "1" || raw === "moderation") {
    return "catalog";
  }
  return "overview";
}

export function isModerationDeepLink(input: ProfileSectionQueryInput): boolean {
  return input.moderation === "1" || input.section?.trim() === "moderation";
}

/** Client URL sync: overview omits `section`; preserves unrelated params (e.g. returnTo). */
export function buildProfileSectionHref(
  section: ProfileSectionId,
  current: URLSearchParams,
): string {
  const next = new URLSearchParams(current.toString());
  if (section === "overview") {
    next.delete("section");
    next.delete("moderation");
    next.delete("branchId");
  } else {
    next.set("section", section);
    if (section !== "catalog") {
      next.delete("moderation");
    }
    if (section !== "branches") {
      next.delete("branchId");
    }
  }
  const qs = next.toString();
  return qs ? `/profile?${qs}` : "/profile";
}
