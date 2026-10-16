import type { NavIconKey } from "@/components/layout/NavIcons";

/** Stable R01 keys → existing cabinet routes (no /clients in R01). */
export type AgentNavSectionKey =
  | "home"
  | "certificates"
  | "clients"
  | "partners"
  | "wallet"
  | "recommendations"
  | "scanner"
  | "history"
  | "notifications"
  | "profile";

export type AgentNavSectionDef = {
  key: AgentNavSectionKey;
  href: string;
  label: string;
  icon: NavIconKey | "wallet" | "notifications" | "more";
  badgeKey?: "partners";
};

export const AGENT_NAV_SECTIONS: AgentNavSectionDef[] = [
  { key: "home", href: "/", label: "Главная", icon: "home" },
  {
    key: "certificates",
    href: "/certificates",
    label: "Сертификаты",
    icon: "home",
  },
  { key: "clients", href: "/clients", label: "Клиенты", icon: "clients" },
  { key: "partners", href: "/partners", label: "Партнёры", icon: "partners", badgeKey: "partners" },
  { key: "wallet", href: "/settlements", label: "Кошелёк", icon: "wallet" },
  { key: "recommendations", href: "/recommendations", label: "Рекомендации", icon: "recommendations" },
  { key: "scanner", href: "/scanner", label: "Сканер", icon: "scanner" },
  { key: "history", href: "/history", label: "История", icon: "history" },
  { key: "notifications", href: "/notifications", label: "Уведомления", icon: "notifications" },
  { key: "profile", href: "/profile", label: "Профиль", icon: "profile" },
];

export const AGENT_DESKTOP_NAV_KEYS: AgentNavSectionKey[] = [
  "home",
  "certificates",
  "clients",
  "partners",
  "wallet",
  "recommendations",
  "scanner",
  "history",
  "profile",
];

/** Frozen agent cabinet (R03): certificates/clients first; legacy sections stay in «Ещё» on mobile. */
export const AGENT_R03_DESKTOP_NAV_KEYS: AgentNavSectionKey[] = [
  "certificates",
  "clients",
  "partners",
  "wallet",
  "profile",
];

export function resolveAgentDesktopNavKeys(
  permitted: readonly AgentNavSectionKey[],
): AgentNavSectionKey[] {
  const hasR03 =
    permitted.includes("certificates") && permitted.includes("clients");
  const order = hasR03 ? AGENT_R03_DESKTOP_NAV_KEYS : AGENT_DESKTOP_NAV_KEYS;
  return order.filter((key) => permitted.includes(key));
}

export function agentSectionByKey(key: AgentNavSectionKey): AgentNavSectionDef {
  const found = AGENT_NAV_SECTIONS.find((s) => s.key === key);
  if (!found) throw new Error(`Unknown nav key: ${key}`);
  return found;
}

export function defaultAgentMobileNavKeys(
  permitted: readonly AgentNavSectionKey[],
): AgentNavSectionKey[] {
  const has = (key: AgentNavSectionKey) => permitted.includes(key);
  const keys: AgentNavSectionKey[] = [];
  if (has("certificates")) keys.push("certificates");
  else if (has("home")) keys.push("home");
  if (has("partners")) keys.push("partners");
  else if (has("scanner")) keys.push("scanner");
  if (has("wallet")) keys.push("wallet");
  if (has("profile")) keys.push("profile");
  return keys.slice(0, 4);
}

export function isPathActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function sectionKeyForPathname(
  pathname: string,
  permitted: readonly AgentNavSectionKey[],
): AgentNavSectionKey | null {
  for (const key of permitted) {
    const { href } = agentSectionByKey(key);
    if (isPathActive(pathname, href)) return key;
  }
  return null;
}
