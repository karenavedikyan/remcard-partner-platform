import { AdminAccountControls, type AdminAccountIdentity } from "./AdminAccountControls";
import { AdminNav } from "./AdminNav";
import styles from "./Admin.module.css";

export function AdminHeader({ identity }: { identity: AdminAccountIdentity | null }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <div className={styles.brand}><strong>remcard<span>.</span></strong><small>Администрирование PROF</small></div>
        <AdminAccountControls identity={identity} />
      </div>
      <AdminNav />
    </header>
  );
}
