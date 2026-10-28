import { AdminPasswordChangePanel } from "@/app/admin/test-users/AdminPasswordChangePanel";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import styles from "../Admin.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPasswordPage() {
  await requireProfPlatformAdmin("/admin/password");
  return (
    <div className={styles.adminPage}>
      <h1>Безопасность администратора</h1>
      <AdminPasswordChangePanel />
    </div>
  );
}
