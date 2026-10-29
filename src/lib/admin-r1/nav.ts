/** Admin R1 navigation — mirrors prototype viewRelease for release=1 (tasks = R2, hidden). */

export const ADMIN_R1_RELEASE = 1 as const;

export type AdminR1NavId =
  | "overview"
  | "partners"
  | "clients"
  | "team"
  | "analytics"
  | "results"
  | "notifications"
  | "settings"
  | "moderation";

export type AdminR1NavItem = {
  id: AdminR1NavId;
  href: string;
  label: string;
  group: "main" | "control";
  /** Prototype min release; R1 keeps only <=1 */
  release: 1 | 2 | 3;
};

export const ADMIN_R1_NAV: readonly AdminR1NavItem[] = [
  { id: "overview", href: "/admin/overview", label: "Обзор", group: "main", release: 1 },
  { id: "partners", href: "/admin/partners", label: "Партнёры", group: "main", release: 1 },
  { id: "clients", href: "/admin/clients", label: "Клиенты", group: "main", release: 1 },
  { id: "team", href: "/admin/team", label: "Команда", group: "main", release: 1 },
  { id: "moderation", href: "/admin/moderation", label: "Модерация", group: "control", release: 1 },
  { id: "analytics", href: "/admin/analytics", label: "Аналитика", group: "control", release: 1 },
  { id: "results", href: "/admin/results", label: "Результативность", group: "control", release: 1 },
  { id: "notifications", href: "/admin/notifications", label: "Уведомления", group: "control", release: 1 },
  { id: "settings", href: "/admin/settings", label: "Настройки", group: "control", release: 1 },
] as const;

/** Explicitly out of R1 — must stay unreachable from production nav. */
export const ADMIN_R1_HIDDEN_VIEWS = ["tasks"] as const;

export function adminR1NavForRelease(release: number = ADMIN_R1_RELEASE): AdminR1NavItem[] {
  return ADMIN_R1_NAV.filter((item) => item.release <= release);
}

export function adminR1NavActive(pathname: string, href: string): boolean {
  if (href === "/admin/overview") {
    return pathname === "/admin/overview" || pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const ADMIN_R1_TITLES: Record<AdminR1NavId, string> = {
  overview: "Обзор проекта",
  partners: "Партнёры",
  clients: "Клиенты",
  team: "Команда",
  analytics: "Аналитика",
  results: "Результативность",
  notifications: "Уведомления",
  settings: "Настройки",
  moderation: "Модерация",
};

export const ADMIN_R1_SUBTITLES: Record<AdminR1NavId, string> = {
  overview: "Главное о росте, людях и партнёрской сети",
  partners: "Регистрация и видимость",
  clients: "Клиентская база и источники рекомендаций",
  team: "Люди и доступ по StaffRole",
  analytics: "От показателя к конкретным записям",
  results: "Сертификаты, сделки, отзывы и каталог",
  notifications: "События проекта в одном месте",
  settings: "Структура проекта и история изменений",
  moderation: "Профили, каталог и отзывы",
};
