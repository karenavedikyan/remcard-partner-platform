"use client";

import styles from "./CabinetShellIdentityReconcileDeadEnd.module.css";
import skeletonStyles from "./CabinetPageLoadingSkeleton.module.css";
import { CabinetPageHeadingPlaceholder, CabinetPageLoadingSkeletonBody } from "@/components/layout/CabinetPageLoadingSkeleton";

export function CabinetShellIdentityReconcileDeadEnd() {
  return (
    <div
      className={skeletonStyles.root}
      role="alert"
      aria-live="polite"
      data-testid="cabinet-shell-identity-reconcile-dead-end"
    >
      <CabinetPageHeadingPlaceholder />
      <div className={styles.messageBlock}>
        <p className={styles.message}>
          Не удалось обновить кабинет. Нажмите «Обновить страницу» или перейдите в другой раздел.
        </p>
        <button type="button" className={styles.reloadButton} onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </div>
      <CabinetPageLoadingSkeletonBody />
    </div>
  );
}
