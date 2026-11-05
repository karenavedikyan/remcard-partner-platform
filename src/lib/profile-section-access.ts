import type { ProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import {
  PROFILE_SECTION_NAV,
  type ProfileSectionId,
} from "@/lib/profile-sections";

/** Canonical STORE/COMPANY owner tab strip (shared with org staff workplace). */
export function businessOrgProfileSectionNav() {
  return PROFILE_SECTION_NAV;
}

export const PROFILE_SECTION_ACCESS_DENIED =
  "Нет доступа. Обратитесь к владельцу.";

/** Owner-facing section hints (same copy as profile panels; not staff-only debug text). */
export const PROFILE_SECTION_OWNER_HINTS: Record<ProfileSectionId, string> = {
  overview:
    "Краткий обзор рабочего профиля, команды и публикации в каталоге RemCard.",
  basics:
    "Рабочие данные для партнёрства. Сохранение не публикует вас в каталоге RemCard и не требует модерации.",
  catalog:
    "Добровольная публикация организации в каталоге RemCard и материалы для модерации.",
  branches: "Адреса и режим работы филиалов организации.",
  team: "Сотрудники, роли и приглашения в организацию.",
  notifications: "Каналы уведомлений кабинета и привязка мессенджеров.",
};

export function orgStaffWorkplaceSectionAllowed(
  sectionId: ProfileSectionId,
  access: Pick<ProfileCabinetAccess, "canOpenTeamSection">,
): boolean {
  if (sectionId === "overview") return true;
  /** Actor-scoped GET/PATCH /api/pro/notification-settings (user.id), not org owner. */
  if (sectionId === "notifications") return true;
  if (sectionId === "team") return access.canOpenTeamSection;
  return false;
}

export function profileSectionNavLabels(
  nav: { label: string }[] = businessOrgProfileSectionNav(),
): string[] {
  return nav.map((item) => item.label);
}
