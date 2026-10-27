"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { AccountSessionMenu } from "@/components/account-session/AccountSessionMenu";
import { BrandMark } from "@/components/layout/BrandMark";
import { CabinetMobileMoreSheet } from "@/components/layout/CabinetMobileMoreSheet";
import { NAV_ICONS, type NavIconKey } from "@/components/layout/NavIcons";
import { ProfPartnerSessionVisit } from "@/components/layout/ProfPartnerSessionVisit";
import { ProfNotificationBellSlot } from "@/components/layout/ProfNotificationBellSlot";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { IconChevronRight, IconMenu } from "@/components/layout/ThemeIcons";
import { isCabinetNavItemActive } from "@/lib/cabinet-nav/active";
import { cabinetNavConfig } from "@/lib/cabinet-nav/config";
import { resolveCabinetNavMode, usesCabinetPrototypeShell } from "@/lib/cabinet-nav/mode";
import type { MasterNavItem } from "@/lib/master-nav/sections";
import styles from "./AppShell.module.css";

const BASE_NAV: Array<{
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

const MOBILE_BOTTOM_NAV: Array<{ href: string; label: string; icon: NavIconKey }> = [
  { href: "/", label: "Главная", icon: "home" },
  { href: "/partners", label: "Партнёры", icon: "partners" },
  { href: "/scanner", label: "Сканер", icon: "scanner" },
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
  "/clients": "Клиенты",
  "/notifications": "Уведомления",
  "/login": "Вход",
  "/onboarding": "Регистрация",
};

function legacyPageTitle(pathname: string, navItems: typeof BASE_NAV): string {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }
  const base = navItems.find(
    (item) => item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)),
  );
  return base?.label ?? "Кабинет партнёра";
}

function userInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "П";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

type AppShellProps = {
  user: AuthUser;
  incomingCount?: number;
  /** Stream B: ProfNotificationBell */
  notificationBell?: React.ReactNode;
  children: React.ReactNode;
};

function NavLinks({
  pathname,
  searchParams,
  incomingCount,
  navItems,
  className,
  onNavigate,
}: {
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
  incomingCount: number;
  navItems: MasterNavItem[];
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navItems.map((item) => {
        const active = isCabinetNavItemActive(item.href, pathname, searchParams);
        const Icon = NAV_ICONS[item.icon];
        const badge =
          item.badgeKey === "partners" && incomingCount > 0 ? incomingCount : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""} ${className ?? ""}`}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
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

export function AppShell({
  user,
  incomingCount = 0,
  notificationBell,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navMode = resolveCabinetNavMode(user);
  const prototypeShell = usesCabinetPrototypeShell(navMode);
  const prototypeConfig = useMemo(
    () => (prototypeShell ? cabinetNavConfig(navMode) : null),
    [navMode, prototypeShell],
  );

  const navItems = prototypeConfig?.desktop ?? BASE_NAV;
  const mobileBottom = prototypeConfig?.mobileBottom ?? MOBILE_BOTTOM_NAV;
  const section = searchParams.get("section");
  const currentPage = prototypeConfig
    ? prototypeConfig.pageTitle(pathname, section)
    : legacyPageTitle(pathname, BASE_NAV);

  const displayName = user.displayName?.trim() || "Партнёр RemCard";
  const initials = userInitials(displayName);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const moreItems = prototypeConfig?.moreItems() ?? [];
  const moreActive =
    prototypeShell &&
    moreItems.some((item) => isCabinetNavItemActive(item.href, pathname, searchParams));

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  return (
    <div className={styles.shell}>
      {user.role === "PRO" ? <ProfPartnerSessionVisit /> : null}
      {mobileMenuOpen ? (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          aria-label="Закрыть меню"
          onClick={closeMobileMenu}
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}
        aria-label="Основная навигация"
      >
        <div className={styles.brandBlock}>
          <BrandMark />
        </div>

        <div className={styles.workspace}>
          <span className={styles.workspaceAvatar} aria-hidden>
            {initials}
          </span>
          <div className={styles.workspaceText}>
            <div className={styles.workspaceName}>{displayName}</div>
            <small className={styles.workspaceHint}>Рабочее пространство</small>
          </div>
        </div>

        <nav className={styles.nav}>
          <NavLinks
            pathname={pathname}
            searchParams={searchParams}
            incomingCount={incomingCount}
            navItems={navItems}
            onNavigate={closeMobileMenu}
          />
        </nav>

        <div className={styles.sidebarFooter}>
          {user.staffRole === "ADMIN" || user.staffRole === "OWNER" ? (
            <>
              <Link href="/admin/moderation" className={styles.adminToolsLink} onClick={closeMobileMenu}>
                Модерация
              </Link>
              <Link href="/admin/test-users" className={styles.adminToolsLink} onClick={closeMobileMenu}>
                Тестовые пользователи
              </Link>
            </>
          ) : null}
          <small className={styles.sidebarTagline}>
            RemCard PROF
            <br />
            Партнёрство начинается с доверия
          </small>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <IconMenu />
            </button>
            <div className={styles.topbarBrand}>
              <BrandMark showSubtitle={false} />
            </div>
            <div className={styles.breadcrumb}>
              <span>Кабинет партнёра</span>
              <IconChevronRight />
              <strong>{currentPage}</strong>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <ThemeToggle />
            <ProfNotificationBellSlot>{notificationBell}</ProfNotificationBellSlot>
            <AccountSessionMenu displayName={displayName} roleLabel="Владелец профиля" />
          </div>
        </header>

        <main className={styles.content}>{children}</main>

        <footer className={styles.shellFooter}>
          <span>Вы работаете от имени {displayName}</span>
          <span className={styles.shellFooterMuted}>RemCard PROF</span>
        </footer>
      </div>

      <nav className={styles.mobileBottom} aria-label="Мобильная навигация">
        {mobileBottom.map((item) => {
          const active = isCabinetNavItemActive(item.href, pathname, searchParams);
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.mobileBottomLink} ${active ? styles.mobileBottomLinkActive : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
        {prototypeShell ? (
          <button
            type="button"
            className={`${styles.mobileBottomLink} ${moreActive ? styles.mobileBottomLinkActive : ""}`}
            aria-label="Ещё разделы"
            aria-current={moreActive ? "page" : undefined}
            data-testid="cabinet-mobile-nav-more"
            onClick={() => setMobileMoreOpen(true)}
          >
            <NAV_ICONS.more />
            Ещё
          </button>
        ) : null}
      </nav>
      {prototypeShell ? (
        <CabinetMobileMoreSheet
          open={mobileMoreOpen}
          onClose={() => setMobileMoreOpen(false)}
          items={moreItems}
        />
      ) : null}
    </div>
  );
}
