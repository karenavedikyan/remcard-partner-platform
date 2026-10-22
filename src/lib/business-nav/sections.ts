import type { NavIconKey } from "@/components/layout/NavIcons";
import type { MasterNavItem } from "@/lib/master-nav/sections";

export type BusinessNavItem = MasterNavItem;

/** Shared prototype desktop row for store owner (reference Te/pa store). */
const BUSINESS_OWNER_CORE: BusinessNavItem[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/clients", label: "Клиенты", icon: "clients" },
  { href: "/recommendations", label: "Сертификаты", icon: "recommendations" },
  { href: "/scanner", label: "Сканер", icon: "scanner" },
  { href: "/partners", label: "Партнёры", icon: "partners", badgeKey: "partners" },
  { href: "/settlements", label: "Кошелёк", icon: "wallet" },
];

export const STORE_DESKTOP_NAV: BusinessNavItem[] = [
  ...BUSINESS_OWNER_CORE,
  { href: "/profile", label: "Профиль", icon: "profile" },
];

export const COMPANY_TEAM_NAV_HREF = "/profile?section=team";

export const COMPANY_DESKTOP_NAV: BusinessNavItem[] = [
  ...BUSINESS_OWNER_CORE,
  { href: COMPANY_TEAM_NAV_HREF, label: "Сотрудники", icon: "team" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

/** Same mobile bottom as standalone MASTER (home / scanner / wallet / profile). */
export const BUSINESS_MOBILE_BOTTOM: BusinessNavItem[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/scanner", label: "Сканер", icon: "scanner" },
  { href: "/settlements", label: "Кошелёк", icon: "wallet" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

export function businessNavMoreItems(desktop: BusinessNavItem[]): BusinessNavItem[] {
  const bottomHrefs = new Set(BUSINESS_MOBILE_BOTTOM.map((i) => i.href));
  return desktop.filter((item) => !bottomHrefs.has(item.href));
}

export function businessPageTitle(pathname: string, desktop: BusinessNavItem[]): string {
  const exact: Record<string, string> = {
    "/": "Главная",
    "/clients": "Клиенты",
    "/recommendations": "Сертификаты",
    "/scanner": "Сканер",
    "/partners": "Партнёры",
    "/settlements": "Кошелёк",
    "/profile": "Профиль",
    "/notifications": "Уведомления",
    "/login": "Вход",
    "/onboarding": "Регистрация",
  };
  if (exact[pathname]) return exact[pathname]!;
  const match = desktop.find(
    (item) => {
      const path = item.href.split("?")[0]!;
      return path !== "/" && (pathname === path || pathname.startsWith(`${path}/`));
    },
  );
  return match?.label ?? "Кабинет партнёра";
}

export function businessPageTitleWithSection(
  pathname: string,
  section: string | null,
  desktop: BusinessNavItem[],
): string {
  if (pathname === "/profile" && section === "team") {
    return "Сотрудники";
  }
  return businessPageTitle(pathname, desktop);
}
