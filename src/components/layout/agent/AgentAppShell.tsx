"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { BrandMark } from "@/components/layout/BrandMark";
import { ProfNotificationBellSlot } from "@/components/layout/ProfNotificationBellSlot";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NAV_ICONS } from "@/components/layout/NavIcons";
import { AgentNavIcon } from "@/components/layout/agent/AgentNavIcon";
import { MobileNavEditorDialog } from "@/components/layout/agent/MobileNavEditorDialog";
import { MobileNavMoreSheet } from "@/components/layout/agent/MobileNavMoreSheet";
import { useAgentCabinetUiPrefs } from "@/components/layout/agent/useAgentCabinetUiPrefs";
import { useAgentThemeSync } from "@/components/layout/agent/useAgentThemeSync";
import {
  AGENT_DESKTOP_NAV_KEYS,
  agentSectionByKey,
  isPathActive,
  sectionKeyForPathname,
  type AgentNavSectionKey,
} from "@/lib/agent-nav/sections";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import styles from "./AgentAppShell.module.css";

const PAGE_TITLES: Record<string, string> = {
  "/": "Главная",
  "/partners": "Партнёры",
  "/recommendations": "Рекомендации",
  "/scanner": "Сканер",
  "/history": "История",
  "/settlements": "Кошелёк",
  "/profile": "Профиль",
  "/notifications": "Уведомления",
};

const HOME_SUBTITLE = "Рекомендуйте. Делитесь. Получайте бонусы.";

function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const key of AGENT_DESKTOP_NAV_KEYS) {
    const { href, label } = agentSectionByKey(key);
    if (href !== "/" && isPathActive(pathname, href)) return label;
  }
  return "Кабинет партнёра";
}

function pageSubtitle(pathname: string): string {
  if (pathname === "/") return HOME_SUBTITLE;
  return "RemCard PROF · агентский кабинет";
}

function userInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "П";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

type AgentAppShellProps = {
  user: AuthUser;
  incomingCount?: number;
  notificationBell?: React.ReactNode;
  initialPrefs: CabinetUiPreferencesResponse;
  children: React.ReactNode;
};

export function AgentAppShell({
  user,
  incomingCount = 0,
  notificationBell,
  initialPrefs,
  children,
}: AgentAppShellProps) {
  const pathname = usePathname();
  const displayName = user.displayName?.trim() || "Партнёр RemCard";
  const initials = userInitials(displayName);
  const { prefs, saveMobileNavKeys, saveTheme } = useAgentCabinetUiPrefs(initialPrefs);

  const permittedKeys = useMemo(
    () => prefs.permittedKeys ?? [],
    [prefs.permittedKeys],
  );
  const primaryKeys = prefs.mobileNavKeys ?? [];
  const activeKey = sectionKeyForPathname(pathname, permittedKeys);
  const primaryActive = activeKey != null && primaryKeys.includes(activeKey);
  const moreActive = activeKey != null && !primaryActive;

  const [moreOpen, setMoreOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useAgentThemeSync(prefs.pilotActive, prefs.theme, saveTheme);

  const desktopKeys = useMemo(
    () => AGENT_DESKTOP_NAV_KEYS.filter((key) => permittedKeys.includes(key)),
    [permittedKeys],
  );

  const onSavePanel = useCallback(
    async (keys: AgentNavSectionKey[]) => {
      await saveMobileNavKeys(keys);
    },
    [saveMobileNavKeys],
  );

  const MoreIcon = NAV_ICONS.more;
  const heading = pageTitle(pathname);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Основная навигация">
        <div className={styles.workspace}>
          <span className={styles.workspaceEyebrow}>Ваше пространство</span>
          <strong className={styles.workspaceName}>{displayName}</strong>
          <small className={styles.workspaceHint}>Агент RemCard</small>
        </div>

        <nav className={styles.nav}>
          {desktopKeys.map((key) => {
            const section = agentSectionByKey(key);
            const active = isPathActive(pathname, section.href);
            const badge =
              section.badgeKey === "partners" && incomingCount > 0 ? incomingCount : null;
            return (
              <Link
                key={key}
                href={section.href}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navIcon}>
                  <AgentNavIcon section={section} />
                </span>
                {section.label}
                {badge ? <span className={styles.navBadge}>{badge}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <small>
            Основное под рукой.
            <br />
            Дополнительные разделы в «Ещё».
          </small>
        </div>
      </aside>

      <div className={styles.mainColumn}>
        <header className={styles.cabinetBar}>
          <div className={styles.cabinetBarStart}>
            <div className={styles.mobileBrand}>
              <BrandMark showSubtitle={false} />
            </div>
            <span className={styles.desktopBarTitle}>{heading}</span>
          </div>
          <div className={styles.cabinetBarActions}>
            <ThemeToggle />
            <ProfNotificationBellSlot>{notificationBell}</ProfNotificationBellSlot>
            <div className={styles.desktopAccount}>
              <span className={styles.accountAvatar} aria-hidden>
                {initials}
              </span>
              <div className={styles.accountCaption}>
                <strong>{displayName}</strong>
                <small>Агент</small>
              </div>
            </div>
            <div className={styles.mobileLogout} data-testid="mobile-logout">
              <LogoutButton className={styles.mobileLogoutButton} />
            </div>
          </div>
        </header>

        <div className={styles.content}>
          <header className={styles.pageHeader}>
            <div>
              <span className={styles.pageEyebrow}>Агент RemCard</span>
              <h1 className={styles.pageTitle}>{heading}</h1>
              <p className={styles.pageMuted}>{pageSubtitle(pathname)}</p>
            </div>
          </header>
          {children}
        </div>
      </div>

      <nav className={styles.mobileBottom} aria-label="Мобильная навигация">
        {primaryKeys.map((key) => {
          const section = agentSectionByKey(key);
          const active = isPathActive(pathname, section.href);
          return (
            <Link
              key={key}
              href={section.href}
              className={`${styles.mobileBottomLink} ${active ? styles.mobileBottomLinkActive : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.mobileBottomIcon}>
                <AgentNavIcon section={section} />
              </span>
              <span className={styles.mobileBottomLabel}>{section.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`${styles.mobileBottomLink} ${moreActive ? styles.mobileBottomLinkActive : ""}`}
          aria-label="Ещё разделы"
          aria-current={moreActive ? "page" : undefined}
          onClick={() => setMoreOpen(true)}
        >
          <span className={styles.mobileBottomIcon}>
            <MoreIcon />
          </span>
          <span className={styles.mobileBottomLabel}>Ещё</span>
        </button>
      </nav>

      <MobileNavMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        pathname={pathname}
        permittedKeys={permittedKeys}
        primaryKeys={primaryKeys}
        onOpenCustomize={() => setEditorOpen(true)}
      />

      <MobileNavEditorDialog
        open={editorOpen}
        initialKeys={primaryKeys}
        permittedKeys={permittedKeys}
        onClose={() => setEditorOpen(false)}
        onSave={onSavePanel}
      />
    </div>
  );
}
