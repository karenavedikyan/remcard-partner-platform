"use client";

import { usePathname } from "next/navigation";
import { AdminAccountControls, type AdminAccountIdentity } from "./AdminAccountControls";
import { AdminNav } from "./AdminNav";
import styles from "./Admin.module.css";

function isPartnersAdminPath(pathname: string): boolean {
  return pathname === "/admin/partners" || pathname.startsWith("/admin/partners/");
}

/** Exact partner-moderation detail card only — not the moderation queue or org routes. */
function isPartnerModerationDetailPath(pathname: string): boolean {
  return /^\/admin\/moderation\/partners\/[^/]+\/?$/.test(pathname);
}

/**
 * Visual admin chrome only (A1 redesign): sidebar brand + topbar account cluster.
 * Navigation destinations and AdminAccountControls behavior stay on the live set.
 * Page H1s remain owned by child routes — this shell does not render a second H1.
 *
 * Partners routes get minimal presentation wiring (icons/breadcrumb/mobile chrome)
 * via data-partners-shell — other admin pages keep exact baseline chrome.
 * Partner-moderation detail uses a separate breadcrumb flag that does not enable
 * partnersChrome / data-partners-shell.
 */
export function AdminHeader({ identity }: { identity: AdminAccountIdentity | null }) {
  const pathname = usePathname() ?? "";
  const partnersShell = isPartnersAdminPath(pathname);
  const moderationPartnerDetailShell = isPartnerModerationDetailPath(pathname);
  const showTopbar = partnersShell || moderationPartnerDetailShell;

  return (
    <>
      <aside
        className={styles.sidebar}
        aria-label="Бренд администратора"
        data-partners-shell={partnersShell ? "true" : undefined}
        data-moderation-partner-detail-shell={moderationPartnerDetailShell ? "true" : undefined}
      >
        <div className={styles.brand}>
          <strong>
            remcard<span>.</span>
          </strong>
          <small>Администрирование PROF</small>
        </div>
        <AdminNav partnersChrome={partnersShell} />
        <div className={styles.accountSlot}>
          <AdminAccountControls identity={identity} />
        </div>
      </aside>
      <div
        className={styles.topbar}
        data-partners-shell={partnersShell ? "true" : undefined}
        data-moderation-partner-detail-shell={moderationPartnerDetailShell ? "true" : undefined}
        {...(showTopbar ? {} : { "aria-hidden": true as const })}
      >
        {partnersShell ? (
          <nav className={styles.partnersBreadcrumb} aria-label="Путь раздела">
            <span>Кабинет администратора</span>
            <span className={styles.partnersBreadcrumbSep} aria-hidden="true">
              ›
            </span>
            <strong>Партнёры</strong>
          </nav>
        ) : null}
        {moderationPartnerDetailShell ? (
          <nav className={styles.partnersBreadcrumb} aria-label="Путь раздела">
            <span>Кабинет администратора</span>
            <span className={styles.partnersBreadcrumbSep} aria-hidden="true">
              ›
            </span>
            <strong>Модерация · партнёр</strong>
          </nav>
        ) : null}
      </div>
    </>
  );
}
