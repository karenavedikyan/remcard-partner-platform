import { AdminAccountControls, type AdminAccountIdentity } from "./AdminAccountControls";
import { AdminNav } from "./AdminNav";
import styles from "./Admin.module.css";

/**
 * Visual admin chrome only (A1 redesign): sidebar brand + topbar account cluster.
 * Navigation destinations and AdminAccountControls behavior stay on the live set.
 * Page H1s remain owned by child routes — this shell does not render a second H1.
 *
 * Account controls live in one slot (no duplicate mounts). On desktop the slot is
 * fixed into the topbar band; on mobile it shares the sticky header flex row with
 * AdminNav so the current-section label cannot paint under the actions.
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
        <div className={styles.accountSlot}>
          <AdminAccountControls identity={identity} />
        </div>
      </aside>
      {/* Desktop topbar surface under the fixed accountSlot; empty of controls. */}
      <div className={styles.topbar} aria-hidden="true" />
    </>
  );
}
