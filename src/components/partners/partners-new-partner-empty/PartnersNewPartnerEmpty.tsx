"use client";

import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import {
  PARTNERS_NEW_PARTNER_EMPTY_FOOT,
  partnersNewPartnerEmptyCopy,
  resolvePartnersNewPartnerEmptyRole,
  type PartnersNewPartnerEmptyStep,
} from "./copy";
import {
  EmptyStateHandshakeIcon,
  EmptyStateLinkIcon,
  EmptyStatePercentIcon,
  EmptyStateSearchIcon,
} from "./icons";
import styles from "./PartnersNewPartnerEmpty.module.css";

export type PartnersNewPartnerEmptyProps = {
  audience: PartnersHubAudience | undefined;
  onOpenFind: () => void;
  onOpenLink: () => void;
};

function StepIcon({ step }: { step: PartnersNewPartnerEmptyStep }) {
  switch (step.icon) {
    case "search":
      return <EmptyStateSearchIcon />;
    case "link":
      return <EmptyStateLinkIcon />;
    case "percent":
      return <EmptyStatePercentIcon />;
    default:
      return <EmptyStateSearchIcon />;
  }
}

/**
 * Prototype copy("partners", role) — own connections empty only (not search zero).
 */
export function PartnersNewPartnerEmpty({
  audience,
  onOpenFind,
  onOpenLink,
}: PartnersNewPartnerEmptyProps) {
  const role = resolvePartnersNewPartnerEmptyRole(audience);
  if (!role) {
    return null;
  }

  const copy = partnersNewPartnerEmptyCopy(role);

  return (
    <section
      className={styles.root}
      data-testid="partners-empty"
      data-empty-state="partners"
      aria-labelledby="partners-new-partner-empty-title"
    >
      <div className={styles.hero}>
        <div className={styles.art} aria-hidden>
          <EmptyStateHandshakeIcon className={styles.artIcon} />
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <h2 className={styles.title} id="partners-new-partner-empty-title">
            {copy.title}
          </h2>
          <p className={styles.lead}>{copy.lead}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onOpenFind}
              data-testid="partners-onboarding-cta-find"
            >
              {copy.primaryLabel}
            </button>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={onOpenLink}
              data-testid="partners-onboarding-cta-link"
            >
              {copy.secondaryLabel}
            </button>
          </div>
        </div>
      </div>
      <ol className={styles.steps}>
        {copy.steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNum}>{index + 1}</span>
            <span className={styles.stepIco}>
              <StepIcon step={step} />
            </span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.note}</small>
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.foot}>{PARTNERS_NEW_PARTNER_EMPTY_FOOT}</p>
    </section>
  );
}
