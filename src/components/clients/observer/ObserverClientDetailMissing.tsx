"use client";

import type { ObserverClientBackFrom } from "./observer-client-back";
import { resolveObserverClientBackLabel } from "./observer-client-back";
import styles from "./observer.module.css";

type Props = {
  clientId?: string;
  onBack: () => void;
  backFrom?: ObserverClientBackFrom;
  backLabel?: string;
};

/** P3 shell — 404 / unknown id before or after K2 GET. */
export function ObserverClientDetailMissing({ clientId, onBack, backFrom, backLabel }: Props) {
  const resolvedBackLabel = resolveObserverClientBackLabel(backFrom, backLabel);
  return (
    <div
      className={styles.section}
      data-testid="ca-observer-client-page"
      data-ca-state="missing"
    >
      <button
        type="button"
        className={styles.backBtn}
        data-ca-action="observer:back"
        data-testid="ca-clients-back"
        onClick={onBack}
      >
        {resolvedBackLabel}
      </button>
      <section className={styles.blocked} data-testid="ca-observer-client-missing">
        <h2>Направление не найдено</h2>
        <p className={styles.mutedSmall}>
          {clientId
            ? `Запись «${clientId}» отсутствует в доступном списке или скрыта фильтрами.`
            : "Запись отсутствует в доступном списке или скрыта фильтрами."}
        </p>
      </section>
    </div>
  );
}
