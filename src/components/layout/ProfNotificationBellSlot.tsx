import type { ReactNode } from "react";
import styles from "./ProfNotificationBellSlot.module.css";

export type ProfNotificationBellSlotProps = {
  /** Stream B (PROF-I-B) mounts ProfNotificationBell here during integration. */
  children?: ReactNode;
};

/**
 * Reserved toolbar region for ProfNotificationBell — no fake inbox or counter in stream A.
 */
export function ProfNotificationBellSlot({ children }: ProfNotificationBellSlotProps) {
  return (
    <div className={styles.slot} data-prof-notification-bell-slot>
      {children}
    </div>
  );
}
