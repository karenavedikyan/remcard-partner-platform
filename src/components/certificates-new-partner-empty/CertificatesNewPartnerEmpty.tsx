"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import buttonStyles from "@/components/ui/Button.module.css";
import {
  certificatesNewPartnerEmptyCopy,
  type CertificatesEmptyAction,
  type CertificatesNewPartnerRole,
} from "./copy";
import { EmptyStateIcon } from "./EmptyStateIcon";
import styles from "./certificates-new-partner-empty.module.css";

type Props = {
  role: CertificatesNewPartnerRole;
  /** Opens existing create flow (dialog or route) without side effects on mount. */
  onCreateCertificate?: () => void;
  /** Agent list uses /certificates/new instead of dialog. */
  createHref?: string;
};

function actionTestId(label: string) {
  return `es-${label.replace(/\s+/g, "-").toLowerCase()}`;
}

function linkAsButtonClass(variant: "primary" | "secondary") {
  return `${buttonStyles.button} ${variant === "primary" ? buttonStyles.primary : buttonStyles.secondary} ${styles.actionLink}`;
}

function EmptyActionControl({
  label,
  action,
  variant,
  onCreateCertificate,
  createHref,
}: {
  label: string;
  action: CertificatesEmptyAction;
  variant: "primary" | "secondary";
  onCreateCertificate?: () => void;
  createHref?: string;
}) {
  const testId = actionTestId(label);

  if (action.kind === "create") {
    if (onCreateCertificate) {
      return (
        <Button
          type="button"
          variant={variant}
          className={styles.actionButton}
          data-testid={testId}
          onClick={onCreateCertificate}
        >
          {label}
        </Button>
      );
    }
    const href = createHref ?? "/certificates/new";
    return (
      <Link href={href} className={linkAsButtonClass(variant)} data-testid={testId}>
        {label}
      </Link>
    );
  }

  if (action.kind === "scan") {
    return (
      <Link href="/scanner" className={linkAsButtonClass(variant)} data-testid={testId}>
        {label}
      </Link>
    );
  }

  if (action.kind === "partners") {
    return (
      <Link href="/partners" className={linkAsButtonClass(variant)} data-testid={testId}>
        {label}
      </Link>
    );
  }

  return (
    <Link href="/profile" className={linkAsButtonClass(variant)} data-testid={testId}>
      {label}
    </Link>
  );
}

export function CertificatesNewPartnerEmpty({ role, onCreateCertificate, createHref }: Props) {
  const copy = certificatesNewPartnerEmptyCopy(role);

  return (
    <section
      className={styles.root}
      data-testid="empty-state"
      data-es-page="certificates"
      aria-labelledby="certificates-empty-title"
    >
      <div className={styles.hero}>
        <div className={styles.art} aria-hidden>
          <EmptyStateIcon name={copy.icon} className={styles.artIcon} />
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <h2 id="certificates-empty-title" className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.lead}>{copy.lead}</p>
          <div className={styles.actions}>
            <EmptyActionControl
              label={copy.primary.label}
              action={copy.primary.action}
              variant="primary"
              onCreateCertificate={onCreateCertificate}
              createHref={createHref}
            />
            {copy.secondary ? (
              <EmptyActionControl
                label={copy.secondary.label}
                action={copy.secondary.action}
                variant="secondary"
                onCreateCertificate={onCreateCertificate}
                createHref={createHref}
              />
            ) : null}
          </div>
        </div>
      </div>
      <ol className={styles.steps}>
        {copy.steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNum}>{index + 1}</span>
            <span className={styles.stepIco}>
              <EmptyStateIcon name={step.icon} className={styles.stepIcoSvg} />
            </span>
            <div>
              <strong className={styles.stepTitle}>{step.title}</strong>
              <small className={styles.stepNote}>{step.note}</small>
            </div>
          </li>
        ))}
      </ol>
      <p className={styles.foot}>
        Раздел заполнится сам, когда появятся первые данные.
      </p>
    </section>
  );
}
