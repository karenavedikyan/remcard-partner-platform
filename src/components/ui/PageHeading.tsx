"use client";

import styles from "./PageHeading.module.css";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** Tighter gap before the page content (Partners page only; other pages keep the default). */
  compact?: boolean;
};

export function PageHeading({ eyebrow, title, description, compact = false }: PageHeadingProps) {
  return (
    <header className={compact ? `${styles.heading} ${styles.headingCompact}` : styles.heading}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h1>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}
