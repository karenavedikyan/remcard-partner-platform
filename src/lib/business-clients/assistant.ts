import type { NavIconKey } from "@/components/layout/NavIcons";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

const PARTNER_ASSISTANT_ROLES = new Set(["PARTNER_MANAGER", "PARTNER_EMPLOYEE"]);

/**
 * Active assistant of a solo partner (specialist): PARTNER_* with an employer. Suspended assistants
 * are deliberately excluded. Whether the employer's Clients screen opens is decided by the server gate.
 */
export function isPartnerAssistantContext(
  proContext: Pick<ProContextSnapshot, "role" | "employer"> | null | undefined,
): boolean {
  const role = proContext?.role?.trim();
  return Boolean(role && PARTNER_ASSISTANT_ROLES.has(role) && proContext?.employer?.id);
}

type AssistantNavItem = { href: string; label: string; icon: NavIconKey };

const CLIENTS_NAV_ITEM: AssistantNavItem = { href: "/clients", label: "Клиенты", icon: "clients" };

/** Inserts «Клиенты» right after «Главная» for an assistant; any other principal gets the list untouched. */
export function withAssistantClientsNav<T extends AssistantNavItem>(items: T[], enabled: boolean): T[] {
  if (!enabled || items.some((item) => item.href === CLIENTS_NAV_ITEM.href)) return items;
  const homeIndex = items.findIndex((item) => item.href === "/");
  const at = homeIndex >= 0 ? homeIndex + 1 : 0;
  return [...items.slice(0, at), CLIENTS_NAV_ITEM as T, ...items.slice(at)];
}
