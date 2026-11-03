"use client";

import { scannerEmptyCopy } from "@/lib/scanner-empty/copy";
import { Button } from "@/components/ui/Button";
import { ScannerEmptyIconScan, ScannerEmptyStepIcon } from "./ScannerEmptyIcons";
import { OnboardingStepItem } from "@/components/onboarding-step/OnboardingStepItem";
import styles from "./scanner-new-partner-empty.module.css";

type ScannerNewPartnerEmptyProps = {
  onOpenScanner: () => void;
};

export function ScannerNewPartnerEmpty({ onOpenScanner }: ScannerNewPartnerEmptyProps) {
  const copy = scannerEmptyCopy();

  return (
    <section
      className={styles.root}
      data-testid="empty-state"
      data-es-page="scanner"
      aria-labelledby="scanner-empty-title"
    >
      <div className={styles.hero}>
        <div className={styles.art} aria-hidden>
          <ScannerEmptyIconScan className={styles.artIcon} />
        </div>
        <div className={styles.heroText}>
          <span className={styles.kicker}>{copy.kicker}</span>
          <h2 id="scanner-empty-title" className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.lead}>{copy.lead}</p>
          <div className={styles.actions}>
            <Button
              type="button"
              className={styles.ctaButton}
              data-testid="es-action-scan"
              onClick={onOpenScanner}
            >
              {copy.ctaLabel}
            </Button>
          </div>
        </div>
      </div>
      <ol className={styles.steps}>
        {copy.steps.map((step, index) => (
          <li key={step.title} className={styles.step}>
            <OnboardingStepItem
              index={index}
              title={step.title}
              note={step.note}
              action={step.action}
              handlers={{ openScanner: onOpenScanner }}
              stepNumClassName={styles.stepNum}
              iconWrapClassName={styles.stepIco}
              titleClassName={styles.stepTitle}
              noteClassName={styles.stepNote}
              iconSlot={<ScannerEmptyStepIcon name={step.icon} className={styles.stepIcoSvg} />}
            />
          </li>
        ))}
      </ol>
      <div className={styles.foot}>
        <span>{copy.footNote}</span>
      </div>
    </section>
  );
}
