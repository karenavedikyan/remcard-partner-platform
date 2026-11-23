import { MiniIconLock } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

export function MiniAppWalletBranchDenied({
  branchLabel, canPickOtherBranch, onPickOtherBranch,
}: {
  branchLabel: string;
  canPickOtherBranch: boolean;
  onPickOtherBranch?: () => void;
}) {
  return (
    <section className={styles.mwBranchDenied} role="alert" data-testid="mini-wallet-branch-denied">
      <h2 className={styles.mwBranchDeniedTitle}>Нет доступа к филиалу</h2>
      <div className={styles.mwBranchDeniedCard}>
        <MiniIconLock className={styles.mwEmptyStepIco} />
        <div>
          <strong>{branchLabel}</strong>
          <p className={styles.mwBranchDeniedLead}>Баланс этой точки недоступен.</p>
        </div>
      </div>
      {canPickOtherBranch && onPickOtherBranch ? (
        <button className={styles.secondaryBtn} type="button" onClick={onPickOtherBranch}>Выбрать другую точку</button>
      ) : null}
    </section>
  );
}
