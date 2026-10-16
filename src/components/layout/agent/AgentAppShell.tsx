"use client";

import Link from "next/link";
import { AccountSessionMenu } from "@/components/account-session/AccountSessionMenu";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { AuthUser } from "@/lib/types";
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
  resolveAgentDesktopNavKeys,
  agentSectionByKey,
  isPathActive,
  sectionKeyForPathname,
  type AgentNavSectionKey,
} from "@/lib/agent-nav/sections";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import styles from "./AgentAppShell.module.css";

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
  /** Dev/screenshot fixture: pretend pathname without changing the route. */
  fixturePathname?: string;
  children: React.ReactNode;
};

export function AgentAppShell({
  user,
  incomingCount = 0,
  notificationBell,
  initialPrefs,
  fixturePathname,
  children,
}: AgentAppShellProps) {
  const pathname = usePathname();
  const activePathname = fixturePathname ?? pathname;
  const displayName = user.displayName?.trim() || "Партнёр RemCard";
  const initials = userInitials(displayName);
  const { prefs, saveMobileNavKeys, saveTheme } = useAgentCabinetUiPrefs(initialPrefs);

  const permittedKeys = useMemo(
    () => prefs.permittedKeys ?? [],
    [prefs.permittedKeys],
  );
  const primaryKeys = prefs.mobileNavKeys ?? [];
  const activeKey = sectionKeyForPathname(activePathname, permittedKeys);
  const primaryActive = activeKey != null && primaryKeys.includes(activeKey);
  const moreActive = activeKey != null && !primaryActive;

  const [moreOpen, setMoreOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useAgentThemeSync(prefs.pilotActive, prefs.theme, saveTheme);

  const desktopKeys = useMemo(
    () => resolveAgentDesktopNavKeys(permittedKeys),
    [permittedKeys],
  );

  const onSavePanel = useCallback(
    async (keys: AgentNavSectionKey[]) => {
      await saveMobileNavKeys(keys);
    },
    [saveMobileNavKeys],
  );

  const MoreIcon = NAV_ICONS.more;

  return (
    <div className={styles.agentRoot}>
      <header className={styles.productTopbar} data-testid="agent-product-topbar">
        <div className={styles.topbarBrand}>
          <BrandMark />
        </div>
        <div className={styles.topbarActions}>
          <ThemeToggle />
          <ProfNotificationBellSlot>{notificationBell}</ProfNotificationBellSlot>
          <div data-testid="agent-account-control">
            <AccountSessionMenu displayName={displayName} roleLabel="Агент" />
          </div>
        </div>
      </header>

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
              const active = isPathActive(activePathname, section.href);
              const badge =
                section.badgeKey === "partners" && incomingCount > 0 ? incomingCount : null;
              return (
                <Link
                  key={key}
                  href={section.href}
                  data-testid={`nav-${key}`}
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

        <main className={styles.mainColumn}>
          <div className={styles.content} data-testid="agent-shell-content">
            {children}
          </div>
        </main>
      </div>

      <nav className={styles.mobileBottom} aria-label="Мобильная навигация">
        {primaryKeys.map((key) => {
          const section = agentSectionByKey(key);
          const active = isPathActive(activePathname, section.href);
          return (
            <Link
              key={key}
              href={section.href}
              data-testid={`nav-mobile-${key}`}
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
          data-testid="mobile-nav-more"
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
        pathname={activePathname}
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
