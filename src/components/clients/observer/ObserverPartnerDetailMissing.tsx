"use client";

import styles from "./observer.module.css";

type Props = {
  partnerId: string;
  onBack: () => void;
};

export function ObserverPartnerDetailMissing({ partnerId, onBack }: Props) {
  return (
    <div className={styles.section} data-testid="ca-observer-partner-page" data-ca-state="missing">
      <button type="button" className={styles.backBtn} data-ca-action="observer:back" onClick={onBack}>
        ← К партнёрам
      </button>
      <section className={styles.blocked} data-testid="ca-observer-partner-missing">
        <h2>Партнёр не найден</h2>
        <p className={styles.mutedSmall}>
          Запись «{partnerId}» отсутствует в доступном списке или скрыта фильтрами.
        </p>
      </section>
    </div>
  );
}
