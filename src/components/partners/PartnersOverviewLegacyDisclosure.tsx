"use client";

import { OVERVIEW_LEGACY_DISCLOSURE_PANEL_ID } from "@/components/partners/partners-overview-greeting";
import styles from "./PartnersOverviewLegacyDisclosure.module.css";

export type PartnersOverviewLegacyDisclosureProps = {
  open: boolean;
  pinned?: boolean;
  /** When true, `aria-controls` references the stable legacy panel id in the DOM. */
  panelTargetMounted?: boolean;
  onOpenChange: (open: boolean) => void;
  collectionCount?: number;
};

export function PartnersOverviewLegacyDisclosure({
  open,
  pinned = false,
  panelTargetMounted = false,
  onOpenChange,
  collectionCount,
}: PartnersOverviewLegacyDisclosureProps) {
  const summaryLabel =
    collectionCount != null && collectionCount > 0
      ? `Открыть список и архив (${collectionCount})`
      : "Открыть список и архив";

  return (
    <div className={`${styles.root} ${open ? styles.open : ""}`}>
      <button
        type="button"
        className={styles.summary}
        data-testid="partners-overview-legacy-disclosure"
        aria-expanded={open}
        aria-controls={
          panelTargetMounted ? OVERVIEW_LEGACY_DISCLOSURE_PANEL_ID : undefined
        }
        disabled={pinned}
        onClick={() => {
          if (pinned) return;
          onOpenChange(!open);
        }}
      >
        <span>{summaryLabel}</span>
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </button>
    </div>
  );
}
