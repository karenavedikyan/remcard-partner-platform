"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import buttonStyles from "@/components/ui/Button.module.css";
import type { ClientsParityDirection } from "@/lib/clients-parity/types";
import {
  clientsEmptyContentForDirection,
  clientsEmptyContentForRole,
  defaultClientsIntroDirection,
  mapClientsAccessToEmptyRole,
  type ClientsEmptyCabinetRole,
} from "./clientsEmptyCopy";
import { ClientsEmptyIcon } from "./ClientsEmptyIcons";
import styles from "./clients-new-partner-empty.module.css";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";

type Props = {
  accessMode: OwnerClientsAccessMode;
  businessPartnerType?: "STORE" | "COMPANY";
  direction?: ClientsParityDirection;
  readOnly?: boolean;
  onAddClient?: () => void;
  onScanCertificate?: () => void;
};

function primaryHref(action: "scan" | "recommend"): string {
  return action === "scan" ? "/scanner" : "/certificates/new";
}

export function ClientsNewPartnerEmptyState({
  accessMode,
  businessPartnerType,
  direction,
  readOnly = false,
  onAddClient,
  onScanCertificate,
}: Props) {
  const role: ClientsEmptyCabinetRole | null = mapClientsAccessToEmptyRole(
    accessMode,
    businessPartnerType,
  );

  const resolvedDirection = direction ?? defaultClientsIntroDirection(accessMode);
  const content = direction
    ? clientsEmptyContentForDirection(resolvedDirection, readOnly)
    : role
      ? clientsEmptyContentForRole(role)
      : null;

  if (!content) return null;

  const primaryTestId =
    content.primaryCta?.action === "scan" ? "es-action-scan" : "es-action-recommend";

  return (
    <section
      className={styles.root}
      data-testid="empty-state"
      data-es-page="clients"
      data-clients-direction={resolvedDirection}
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
          {content.primaryCta || content.secondaryCta ? (
            <div className={styles.actions}>
              {content.primaryCta ? (
                onScanCertificate && content.primaryCta.action === "scan" ? (
                  <Button
                    type="button"
                    variant="primary"
                    className={styles.actionButton}
                    data-testid={primaryTestId}
                    onClick={onScanCertificate}
                  >
                    {content.primaryCta.label}
                  </Button>
                ) : (
                  <Link
                    href={primaryHref(content.primaryCta.action)}
                    className={`${buttonStyles.button} ${buttonStyles.primary} ${styles.actionLink}`}
                    data-testid={primaryTestId}
                  >
                    {content.primaryCta.label}
                  </Link>
                )
              ) : null}
              {content.secondaryCta ? (
                <Button
                  type="button"
                  variant="secondary"
                  className={styles.actionButton}
                  data-testid="es-client-add"
                  onClick={() => onAddClient?.()}
                >
                  {content.secondaryCta.label}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <ol className={styles.steps}>
        {content.steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNum}>{index + 1}</span>
            <span className={styles.stepIco}>
              <ClientsEmptyIcon name={step.icon} className={styles.stepIcon} />
            </span>
            <div>
              <strong className={styles.stepTitle}>{step.title}</strong>
              <small className={styles.stepNote}>{step.note}</small>
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.foot}>
        <span>{content.foot}</span>
      </div>
    </section>
  );
}