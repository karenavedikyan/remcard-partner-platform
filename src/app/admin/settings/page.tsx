import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import styles from "../Admin.module.css";
import { AdminSettingsClient } from "./AdminSettingsClient";

export const dynamic = "force-dynamic";

/**
 * A35a R1 «Настройки» — informational types/rules, release boundary, staff-access audit read.
 * Mutations (access, notifications writer, partner types R3) stay on their existing routes.
 */
export default async function AdminSettingsPage() {
  await requireProfPlatformAdmin("/admin/settings");
  return (
    <div className={styles.adminPageWide}>
      <AdminSettingsClient />
    </div>
  );
}
