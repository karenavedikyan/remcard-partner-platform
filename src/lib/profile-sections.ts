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
  { id: "branches", label: "Точки" },
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

export const COMPANY_BRANCHES_SECTION_LABEL = "Филиалы";

/** Company calls its additional addresses «Филиалы»; store and specialist keep «Точки». Ids and routes never change. */
export function withPartnerSectionLabels<T extends { id: ProfileSectionId; label: string }>(
  nav: readonly T[],
  partnerType: string | null | undefined,
): T[] {
  if (partnerType !== "COMPANY") return [...nav];
  return nav.map((item) =>
    item.id === "branches" ? { ...item, label: COMPANY_BRANCHES_SECTION_LABEL } : item,
  );
}

export function withoutBranchesSection<T extends { id: ProfileSectionId }>(nav: readonly T[]): T[] {
  return nav.filter((item) => item.id !== "branches");
}

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
  /** Specialist (MASTER owner and staff) has no «Точки» tab: deep links fall back to the overview. */
  hideBranches?: boolean;
};

export function resolveProfileSectionFromQuery(
  input: ProfileSectionQueryInput,
  opts?: ResolveProfileSectionOptions,
): ProfileSectionId {
  const resolved = resolveProfileSectionFromQueryRaw(input, opts);
  return opts?.hideBranches && resolved === "branches" ? "overview" : resolved;
}

function resolveProfileSectionFromQueryRaw(
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
/** One-shot query flag: open the working-profile wizard directly (skip the empty intro). */
export const PROFILE_FILL_PARAM = "fill";

export function buildProfileSectionHref(
  section: ProfileSectionId,
  current: URLSearchParams,
): string {
  const next = new URLSearchParams(current.toString());
  next.delete(PROFILE_FILL_PARAM);
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
