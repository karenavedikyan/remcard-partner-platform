import styles from "./WelcomeContentAreaPending.module.css";

type WelcomeContentAreaPendingProps = {
  testId?: string;
  label?: string;
};

/** Neutral compact placeholder until welcome vs list eligibility is known. */
export function WelcomeContentAreaPending({
  testId = "welcome-content-area-pending",
  label = "Загрузка раздела",
}: WelcomeContentAreaPendingProps) {
  return (
    <div
      className={styles.root}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      data-testid={testId}
    >
      <span className={styles.barWide} aria-hidden />
      <span className={styles.barMedium} aria-hidden />
      <div className={styles.blockRow} aria-hidden>
        <span className={styles.block} />
        <span className={styles.block} />
      </div>
    </div>
  );
}
