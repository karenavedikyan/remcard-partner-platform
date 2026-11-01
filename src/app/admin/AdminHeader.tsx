"use client";

import { usePathname } from "next/navigation";
import { AdminAccountControls, type AdminAccountIdentity } from "./AdminAccountControls";
import { AdminNav, adminSectionLabel } from "./AdminNav";
import styles from "./Admin.module.css";

function isPartnersAdminPath(pathname: string): boolean {
  return pathname === "/admin/partners" || pathname.startsWith("/admin/partners/");
}

/** Exact partner-moderation detail card only — not the moderation queue or org routes. */
function isPartnerModerationDetailPath(pathname: string): boolean {
  return /^\/admin\/moderation\/partners\/[^/]+\/?$/.test(pathname);
}

/** Exact organization-moderation detail card only — not the queue or partner routes. */
function isOrgModerationDetailPath(pathname: string): boolean {
  return /^\/admin\/moderation\/organizations\/[^/]+\/?$/.test(pathname);
}

/**
 * A17b unified admin chrome: sidebar brand + grouped nav + always-on topbar breadcrumb.
 * Page H1s remain owned by child routes — this shell does not render a second H1.
 * Partners / moderation-detail data-* flags stay for route-scoped presentation hooks
 * owned by those streams; icons and breadcrumb are global (no chrome gate prop).
 */
export function AdminHeader({ identity }: { identity: AdminAccountIdentity | null }) {
  const pathname = usePathname() ?? "";
  const partnersShell = isPartnersAdminPath(pathname);
  const moderationPartnerDetailShell = isPartnerModerationDetailPath(pathname);
  const moderationOrgDetailShell = isOrgModerationDetailPath(pathname);

  let breadcrumbStrong = adminSectionLabel(pathname);
  if (moderationPartnerDetailShell) breadcrumbStrong = "Модерация · партнёр";
  else if (moderationOrgDetailShell) breadcrumbStrong = "Модерация · организация";

  return (
    <>
      <aside
        className={styles.sidebar}
        aria-label="Бренд администратора"
        data-partners-shell={partnersShell ? "true" : undefined}
        data-moderation-partner-detail-shell={moderationPartnerDetailShell ? "true" : undefined}
        data-moderation-org-detail-shell={moderationOrgDetailShell ? "true" : undefined}
      >
        <div className={styles.brand}>
          <strong>
            remcard<span>.</span>
          </strong>
          <small>Управление проектом</small>
        </div>
        <AdminNav />
        <div className={styles.accountSlot}>
          <AdminAccountControls identity={identity} />
        </div>
      </aside>
      <div
        className={styles.topbar}
        data-partners-shell={partnersShell ? "true" : undefined}
        data-moderation-partner-detail-shell={moderationPartnerDetailShell ? "true" : undefined}
        data-moderation-org-detail-shell={moderationOrgDetailShell ? "true" : undefined}
      >
        <nav className={styles.partnersBreadcrumb} aria-label="Путь раздела">
          <span>Кабинет администратора</span>
          <span className={styles.partnersBreadcrumbSep} aria-hidden="true">
            ›
          </span>
          <strong>{breadcrumbStrong}</strong>
        </nav>
      </div>
    </>
  );
}
