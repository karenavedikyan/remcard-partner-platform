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

/** Reference agent cabinet: overview, basics, notifications only. */
export const PURE_AGENT_PROFILE_SECTION_NAV = PROFILE_SECTION_NAV.filter((item) =>
  (["overview", "basics", "notifications"] as ProfileSectionId[]).includes(item.id),
);

const PURE_AGENT_SECTIONS = new Set<ProfileSectionId>(
  PURE_AGENT_PROFILE_SECTION_NAV.map((item) => item.id),
);

export function profileSectionNav(opts?: { pureAgentCompact?: boolean }) {
  return opts?.pureAgentCompact ? PURE_AGENT_PROFILE_SECTION_NAV : PROFILE_SECTION_NAV;
}

export function isPureAgentProfileSection(section: ProfileSectionId): boolean {
  return PURE_AGENT_SECTIONS.has(section);
}

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

export type ResolveProfileSectionOptions = {
  /** Principal pure agent with R02 profile gate — disallow business-only tabs/deep links. */
  pureAgentCompact?: boolean;
};

export function resolveProfileSectionFromQuery(
  input: ProfileSectionQueryInput,
  opts?: ResolveProfileSectionOptions,
): ProfileSectionId {
  const pureAgentCompact = Boolean(opts?.pureAgentCompact);
  const raw = input.section?.trim();

  if (pureAgentCompact) {
    if (raw && isPureAgentProfileSection(raw as ProfileSectionId)) {
      return raw as ProfileSectionId;
    }
    return "overview";
  }

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
