"use client";

import type { ReactNode } from "react";
import { useOwnerClientsBusinessPartnerType, useOwnerClientsMode } from "@/components/clients/OwnerClientsModeContext";
import styles from "./receiving.module.css";

/** Prototype page-header kicker: the partner type of the cabinet that owns the section. */
export function useClientsPartnerKindLabel(): string | null {
  const mode = useOwnerClientsMode();
  const partnerType = useOwnerClientsBusinessPartnerType();
  if (mode === "business") return partnerType === "STORE" ? "Магазин" : partnerType === "COMPANY" ? "Компания" : null;
  if (mode === "specialist") return "Специалист";
  if (mode === "agent") return "Агент";
  return null;
}

type Props = {
  onBack: () => void;
  backLabel?: string;
  title: ReactNode;
  titleId?: string;
  /** Status badge rendered right next to the title (not right-aligned). */
  badge?: ReactNode;
  subtitle?: ReactNode;
  subtitleTestId?: string;
};

/**
 * Header of a full-screen sub-view (card, analytics, stages and reasons, new client, scan):
 * «← К списку клиентов», the partner-type kicker, the title with its badge and one subtitle line.
 * The section page header and the direction switcher are not shown above these screens.
 */
export function ReceivingSubpageHead({ onBack, backLabel = "К списку клиентов", title, titleId, badge, subtitle, subtitleTestId }: Props) {
  const kind = useClientsPartnerKindLabel();
  return (
    <header className={styles.subpageHead} data-testid="ca-receiving-subpage-head">
      <button type="button" className="ca-back" data-ca-action="receiving:back" data-testid="ca-clients-back" onClick={onBack}>
        <span aria-hidden="true">←</span> {backLabel}
      </button>
      {kind ? <span className={styles.subpageKicker}>{kind}</span> : null}
      <div className={styles.subpageTitleRow}>
        <h1 id={titleId}>{title}</h1>
        {badge}
      </div>
      {subtitle ? (
        <p className={styles.subpageSubtitle} data-testid={subtitleTestId}>
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
