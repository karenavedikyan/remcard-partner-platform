import { AdminAccountControls, type AdminAccountIdentity } from "./AdminAccountControls";
import { AdminNav } from "./AdminNav";
import styles from "./Admin.module.css";

/**
 * Visual admin chrome only (A1 redesign): sidebar brand + topbar account cluster.
 * Navigation destinations and AdminAccountControls behavior stay on the live set.
 * Page H1s remain owned by child routes — this shell does not render a second H1.
 */
export function AdminHeader({ identity }: { identity: AdminAccountIdentity | null }) {
  return (
    <>
      <aside className={styles.sidebar} aria-label="Бренд администратора">
        <div className={styles.brand}>
          <strong>
            remcard<span>.</span>
          </strong>
          <small>Администрирование PROF</small>
        </div>
        <AdminNav />
      </aside>
      <div className={styles.topbar}>
        <div className={styles.topbarActions}>
          <AdminAccountControls identity={identity} />
        </div>
      </div>
    </>
  );
}
