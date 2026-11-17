import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

const ORG_STAFF_ROLES = new Set(["BRANCH_MANAGER", "BRANCH_EMPLOYEE", "ORG_TEAM_MEMBER", "ORG_EMPLOYEE"]);
const PARTNER_STAFF_ROLES = new Set(["PARTNER_MANAGER", "PARTNER_EMPLOYEE"]);

/**
 * Neutral explanation shown instead of the server's «Доступно только партнёрам» + «Повторить» when the
 * partnership list answers 403. The server rule is unchanged: partnerships are organization-wide, so an
 * organization employee needs the partnership right in every active branch.
 */
export function partnersAccessNote(proContext: ProContextSnapshot | null | undefined): string {
  const role = proContext?.role?.trim() ?? "";
  if (ORG_STAFF_ROLES.has(role)) {
    return "Партнёрствами организации можно управлять при праве на партнёрства во всех её филиалах. Если нужен доступ, обратитесь к владельцу.";
  }
  if (PARTNER_STAFF_ROLES.has(role)) {
    return "Партнёрствами работодателя управляет владелец. Если нужен доступ, обратитесь к нему.";
  }
  return "Раздел «Партнёры» недоступен для этой учётной записи. Если нужен доступ, обратитесь к владельцу.";
}
