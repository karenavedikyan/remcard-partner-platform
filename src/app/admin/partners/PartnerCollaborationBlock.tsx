"use client";

import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import styles from "./AdminPartners.module.css";
import {
  COLLABORATION_SCOPE_HINT,
  collaborationVisibilityPresentation,
  collaborationVisibilityPrimaryLabel,
  partnershipCountsBreakdown,
} from "./partnerCollaborationDisplay";
import { PartnerCollaborationCountLink } from "./PartnerCollaborationCountLink";

type Props = {
  row: PartnerRegistryItem;
  variant?: "table" | "card";
};

export function PartnerCollaborationBlock({ row, variant = "table" }: Props) {
  const visibility = collaborationVisibilityPresentation(row);
  const primary = collaborationVisibilityPrimaryLabel(visibility);
  const breakdown = partnershipCountsBreakdown(row);
  const rootClass =
    variant === "card" ? `${styles.collaborationBlock} ${styles.collaborationBlockCard}` : styles.collaborationBlock;

  const visibilityBadgeClass =
    visibility.kind === "visible"
      ? `${styles.badge} ${styles.collaborationVisible}`
      : visibility.kind === "hidden"
        ? `${styles.badge} ${styles.collaborationHidden}`
        : `${styles.badge} ${styles.collaborationUnknown}`;

  return (
    <div className={rootClass}>
      {variant === "card" ? <p className={styles.collaborationScopeHint}>{COLLABORATION_SCOPE_HINT}</p> : null}
      <div className={styles.collaborationPrimary}>
        <span className={visibilityBadgeClass}>{primary}</span>
        {visibility.kind !== "missing" ? (
          <span className={styles.collaborationAdminSetting}>
            Настройка: {visibility.adminSettingLabel}
          </span>
        ) : null}
        {visibility.kind === "hidden" && visibility.reasonLabel && primary !== visibility.reasonLabel ? (
          <span className={styles.collaborationReason}>{visibility.reasonLabel}</span>
        ) : null}
      </div>
      <p className={styles.collaborationCountsLine}>
        <span>
          Активных: <PartnerCollaborationCountLink row={row} countKey="active" />
        </span>
        <span className={styles.collaborationCountsSep} aria-hidden="true">
          ·
        </span>
        <span>
          Всего связей: <PartnerCollaborationCountLink row={row} countKey="total" />
        </span>
      </p>
      <details className={styles.collaborationDetails}>
        <summary>
          {breakdown.length > 0 ? "Пояснение и статусы связей" : "Пояснение поиска сотрудничества"}
        </summary>
        {variant === "table" ? <p className={styles.collaborationScopeHint}>{COLLABORATION_SCOPE_HINT}</p> : null}
        {breakdown.length > 0 ? (
          <dl className={styles.collaborationBreakdown}>
            {breakdown.map((item) => (
              <div key={item.key} className={styles.collaborationBreakdownRow}>
                <dt>{item.label}</dt>
                <dd>
                  <PartnerCollaborationCountLink row={row} countKey={item.key} />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className={styles.mutedInline}>Детальные счётчики партнёрств: нет данных с сервера</p>
        )}
      </details>
    </div>
  );
}
