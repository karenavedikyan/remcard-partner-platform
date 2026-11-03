"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import buttonStyles from "@/components/ui/Button.module.css";
import {
  clientsEmptyContentForRole,
  mapClientsAccessToEmptyRole,
  type ClientsEmptyCabinetRole,
} from "./clientsEmptyCopy";
import { ClientsEmptyIcon } from "./ClientsEmptyIcons";
import { OnboardingStepItem } from "@/components/onboarding-step/OnboardingStepItem";
import styles from "./clients-new-partner-empty.module.css";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";

type Props = {
  accessMode: OwnerClientsAccessMode;
  businessPartnerType?: "STORE" | "COMPANY";
  onAddClient?: () => void;
  canLinkOnboardingHistory?: boolean;
};

function primaryHref(action: "scan" | "recommend"): string {
  return action === "scan" ? "/scanner" : "/certificates/new";
}

export function ClientsNewPartnerEmptyState({
  accessMode,
  businessPartnerType,
  onAddClient,
  canLinkOnboardingHistory,
}: Props) {
  const role: ClientsEmptyCabinetRole | null = mapClientsAccessToEmptyRole(
    accessMode,
    businessPartnerType,
  );
  if (!role) return null;

  const content = clientsEmptyContentForRole(role, {
    canLinkReadOnlyHistory: canLinkOnboardingHistory,
  });
  const primaryTestId =
    content.primaryCta.action === "scan" ? "es-action-scan" : "es-action-recommend";

  return (
    <section
      className={styles.root}
      data-testid="empty-state"
      data-es-page="clients"
      aria-labelledby="clients-empty-title"
    >
      <div className={styles.hero}>
        <div className={styles.art} aria-hidden="true">
          <ClientsEmptyIcon name={content.icon} className={styles.heroIcon} />
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{content.kicker}</span>
          <h2 id="clients-empty-title" className={styles.title}>
            {content.title}
          </h2>
          <p className={styles.lead}>{content.lead}</p>
          <div className={styles.actions}>
            <Link
              href={primaryHref(content.primaryCta.action)}
              className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.actionLink}`}
              data-testid={primaryTestId}
            >
              {content.primaryCta.label}
            </Link>
            <Button
              type="button"
              variant="secondary"
              className={`${styles.actionButton}`}
              data-testid="es-client-add"
              onClick={() => onAddClient?.()}
            >
              {content.secondaryCta.label}
            </Button>
          </div>
        </div>
      </div>
      <ol className={styles.steps}>
        {content.steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <OnboardingStepItem
              index={index}
              title={step.title}
              note={step.note}
              action={step.action}
              handlers={{ onAddClient }}
              stepNumClassName={styles.stepNum}
              iconWrapClassName={styles.stepIco}
              titleClassName={styles.stepTitle}
              noteClassName={styles.stepNote}
              iconSlot={<ClientsEmptyIcon name={step.icon} className={styles.stepIcon} />}
            />
          </li>
        ))}
      </ol>
      <div className={styles.foot}>
        <span>Раздел заполнится сам, когда появятся первые данные.</span>
      </div>
    </section>
  );
}
