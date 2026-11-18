"use client";

import styles from "./PageHeading.module.css";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** Tighter gap before the page content (Partners page only; other pages keep the default). */
  compact?: boolean;
  /** Ref callback of an empty slot at the right of the title row (portal target for compact page controls). */
  actionSlotRef?: (element: HTMLElement | null) => void;
};

export function PageHeading({
  eyebrow,
  title,
  description,
  compact = false,
  actionSlotRef,
}: PageHeadingProps) {
  return (
    <header className={compact ? `${styles.heading} ${styles.headingCompact}` : styles.heading}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      {actionSlotRef ? (
        <div className={styles.titleRow}>
          <h1>{title}</h1>
          <div ref={actionSlotRef} className={styles.titleAction} />
        </div>
      ) : (
        <h1>{title}</h1>
      )}
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}
