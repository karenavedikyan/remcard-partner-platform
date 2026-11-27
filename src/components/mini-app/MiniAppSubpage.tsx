import type { ReactNode } from "react";
import styles from "./mini-app.module.css";

type Props = {
  backLabel?: string;
  title: string;
  lead?: string;
  onBack: () => void;
  backDisabled?: boolean;
  children: ReactNode;
};

export function MiniAppSubpage({
  backLabel = "← К кабинету",
  title,
  lead,
  onBack,
  backDisabled = false,
  children,
}: Props) {
  return (
    <div className={styles.subpage}>
      <button type="button" className={styles.backBtn} disabled={backDisabled} onClick={onBack}>
        {backLabel}
      </button>
      <h1 className={styles.subpageTitle}>{title}</h1>
      {lead ? <p className={styles.subpageLead}>{lead}</p> : null}
      {children}
    </div>
  );
}