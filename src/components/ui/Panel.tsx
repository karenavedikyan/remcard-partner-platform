import type { PropsWithChildren, ReactNode } from "react";
import styles from "./Panel.module.css";

type PanelProps = PropsWithChildren<{
  title?: ReactNode;
  hint?: ReactNode;
  compact?: boolean;
  className?: string;
}>;

export function Panel({ title, hint, compact, className, children }: PanelProps) {
  return (
    <section
      className={`${styles.panel} ${compact ? styles.panelCompact : ""} ${className ?? ""}`}
    >
      {title ? <h2 className={styles.panelTitle}>{title}</h2> : null}
      {children}
      {hint ? <p className={styles.panelHint}>{hint}</p> : null}
    </section>
  );
}
