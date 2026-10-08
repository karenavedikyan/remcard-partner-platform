"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ProfNotificationBell } from "@/components/notifications/ProfNotificationBell";
import { BrandMark } from "@/components/layout/BrandMark";
import { NAV_ICONS, type NavIconKey } from "@/components/layout/NavIcons";
import styles from "./AppShell.module.css";

const NAV: Array<{
  href: string;
  label: string;
  icon: NavIconKey;
  badgeKey?: "partners";
}> = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/partners", label: "Партнёры", icon: "partners", badgeKey: "partners" },
  { href: "/recommendations", label: "Рекомендации", icon: "recommendations" },
  { href: "/scanner", label: "Сканер", icon: "scanner" },
  { href: "/history", label: "История", icon: "history" },
  { href: "/settlements", label: "Взаиморасчёты", icon: "settlements" },
  { href: "/profile", label: "Профиль", icon: "profile" },
];

const PAGE_TITLES: Record<string, string> = {
  "/": "Главная",
  "/partners": "Партнёры",
  "/recommendations": "Рекомендации",
  "/scanner": "Сканер",
  "/history": "История",
  "/settlements": "Взаиморасчёты",
  "/profile": "Профиль",
  "/notifications": "Уведомления",
  "/login": "Вход",
  "/onboarding": "Регистрация",
};

function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }
  const base = NAV.find(
    (item) => item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return base?.label ?? "Кабинет партнёра";
}

type AppShellProps = {
  user: AuthUser;
  incomingCount?: number;
  children: React.ReactNode;
};

function NavLinks({
  pathname,
  incomingCount,
  className,
}: {
  pathname: string;
  incomingCount: number;
  className?: string;
}) {
  return (
    <>
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = NAV_ICONS[item.icon];
        const badge =
          item.badgeKey === "partners" && incomingCount > 0 ? incomingCount : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""} ${className ?? ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span className={styles.navIcon}>
              <Icon />
            </span>
            {item.label}
            {badge ? <span className={styles.navBadge}>{badge}</span> : null}
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ user, incomingCount = 0, children }: AppShellProps) {
  const pathname = usePathname();
  const currentPage = pageTitle(pathname);
  const displayName = user.displayName?.trim() || "Партнёр RemCard";

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Основная навигация">
        <div className={styles.brandBlock}>
          <BrandMark />
        </div>

        <div className={styles.workspace}>
          <div className={styles.workspaceLabel}>Рабочее пространство</div>
          <div className={styles.workspaceName}>{displayName}</div>
        </div>

        <nav className={styles.nav}>
          <NavLinks pathname={pathname} incomingCount={incomingCount} />
        </nav>

        <div className={styles.sidebarFooter}>
          <LogoutButton className={styles.sidebarLogoutButton} />
        </div>
      </aside>

      <div className={styles.main}>
        <nav className={styles.mobileNav} aria-label="Мобильная навигация">
          <NavLinks pathname={pathname} incomingCount={incomingCount} />
        </nav>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            Кабинет партнёра › <strong>{currentPage}</strong>
          </div>
          <div className={styles.topbarActions}>
            <ProfNotificationBell />
            <div className={styles.topbarAccount}>{displayName}</div>
            <div className={styles.mobileLogout} data-testid="mobile-logout">
              <LogoutButton className={styles.mobileLogoutButton} />
            </div>
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
