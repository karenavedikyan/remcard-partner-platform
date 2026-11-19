"use client";

import styles from "./PageHeading.module.css";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  /** Tighter gap before the page content (Partners page only; other pages keep the default). */
  compact?: boolean;
  /**
   * Partners page: CTA beside eyebrow on desktop, below title block on narrow viewports.
   * Default: action slot on the title row (clients list pattern).
   */
  headerLayout?: "default" | "partnersChrome";
  /** Ref callback of an empty slot at the right of the title row (portal target for compact page controls). */
  actionSlotRef?: (element: HTMLElement | null) => void;
};

export function PageHeading({
  eyebrow,
  title,
  description,
  compact = false,
  headerLayout = "default",
  actionSlotRef,
}: PageHeadingProps) {
  const headingClass = [
    styles.heading,
    compact ? styles.headingCompact : "",
    headerLayout === "partnersChrome" && actionSlotRef ? styles.headingPartnersChrome : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (headerLayout === "partnersChrome" && actionSlotRef) {
    return (
      <header className={headingClass}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.partnersTitle}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        <div ref={actionSlotRef} className={styles.partnersHeadAction} />
      </header>
    );
  }

  return (
    <header className={headingClass}>
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
