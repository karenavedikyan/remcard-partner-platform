"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/types";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { BrandMark } from "@/components/layout/BrandMark";
import { ProfNotificationBellSlot } from "@/components/layout/ProfNotificationBellSlot";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { IconChevronRight } from "@/components/layout/ThemeIcons";
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

function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const key of AGENT_DESKTOP_NAV_KEYS) {
    const { href, label } = agentSectionByKey(key);
    if (href !== "/" && isPathActive(pathname, href)) return label;
  }
  return "Кабинет партнёра";
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
    () =>
      AGENT_DESKTOP_NAV_KEYS.filter((key) => permittedKeys.includes(key)),
    [permittedKeys],
  );

  const onSavePanel = useCallback(
    async (keys: AgentNavSectionKey[]) => {
      try {
        await saveMobileNavKeys(keys);
      } catch {
        /* surface via future toast; keep local until retry */
      }
    },
    [saveMobileNavKeys],
  );

  const MoreIcon = NAV_ICONS.more;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Основная навигация">
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

        <div className={styles.sidebarFooter}>
          <LogoutButton className={styles.sidebarLogoutButton} />
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
            <div className={styles.breadcrumb}>
              <span>Кабинет партнёра</span>
              <IconChevronRight />
              <strong>{pageTitle(pathname)}</strong>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <ThemeToggle />
            <ProfNotificationBellSlot>{notificationBell}</ProfNotificationBellSlot>
            <div className={styles.topbarAccount}>
              <span className={styles.accountAvatar} aria-hidden>
                {initials}
              </span>
              <div className={styles.accountCaption}>
                <strong>{displayName}</strong>
                <small>Агент RemCard</small>
              </div>
            </div>
            <div className={styles.mobileLogout} data-testid="mobile-logout">
              <LogoutButton className={styles.mobileLogoutButton} />
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>

        <footer className={styles.shellFooter}>
          <span>Вы работаете от имени {displayName}</span>
          <span className={styles.shellFooterMuted}>RemCard PROF</span>
        </footer>
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
              <AgentNavIcon section={section} />
              {section.label}
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
          <MoreIcon />
          Ещё
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
