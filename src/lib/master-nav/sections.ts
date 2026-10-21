import type { NavIconKey } from "@/components/layout/NavIcons";

export type MasterNavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  badgeKey?: "partners";
};

/** Standalone MASTER sidebar order (reference roles.js pa). */
export const MASTER_DESKTOP_NAV: MasterNavItem[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/clients", label: "Клиенты", icon: "clients" },
  { href: "/recommendations", label: "Сертификаты", icon: "recommendations" },
  { href: "/scanner", label: "Сканер", icon: "scanner" },
  { href: "/partners", label: "Партнёры", icon: "partners", badgeKey: "partners" },
  { href: "/settlements", label: "Кошелёк", icon: "settlements" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

export const MASTER_MOBILE_BOTTOM_KEYS = ["home", "scanner", "wallet", "profile"] as const;

export const MASTER_MOBILE_BOTTOM: MasterNavItem[] = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/scanner", label: "Сканер", icon: "scanner" },
  { href: "/settlements", label: "Кошелёк", icon: "settlements" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

export function masterNavMoreItems(): MasterNavItem[] {
  const bottomHrefs = new Set(MASTER_MOBILE_BOTTOM.map((i) => i.href));
  return MASTER_DESKTOP_NAV.filter((item) => !bottomHrefs.has(item.href));
}

export function masterPageTitle(pathname: string): string {
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
  const match = MASTER_DESKTOP_NAV.find(
    (item) => item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return match?.label ?? "Кабинет партнёра";
}
