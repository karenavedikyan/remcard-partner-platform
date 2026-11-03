"use client";

import { scannerEmptyCopy } from "@/lib/scanner-empty/copy";
import { Button } from "@/components/ui/Button";
import { ScannerEmptyIconScan, ScannerEmptyStepIcon } from "./ScannerEmptyIcons";
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
            <span className={styles.stepNum}>{index + 1}</span>
            <span className={styles.stepIco}>
              <ScannerEmptyStepIcon name={step.icon} className={styles.stepIcoSvg} />
            </span>
            <div>
              <strong className={styles.stepTitle}>{step.title}</strong>
              <small className={styles.stepNote}>{step.note}</small>
            </div>
          </li>
        ))}
      </ol>
      <div className={styles.foot}>
        <span>{copy.footNote}</span>
      </div>
    </section>
  );
}
