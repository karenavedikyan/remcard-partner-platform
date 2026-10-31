import { AdminPasswordChangePanel } from "@/app/admin/test-users/AdminPasswordChangePanel";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import styles from "../Admin.module.css";
import r1 from "../test-users/AdminPasswordChangePanel.r1.module.css";

export const dynamic = "force-dynamic";

export default async function AdminPasswordPage() {
  await requireProfPlatformAdmin("/admin/password");
  return (
    <div className={`${styles.adminPage} ${r1.page}`} data-admin-password-page="r1">
      <header className={r1.pageHead}>
        <h1 className={r1.pageTitle}>Безопасность администратора</h1>
        <p className={r1.pageLead}>Управление паролем входа в административный кабинет RemCard.</p>
      </header>
      <AdminPasswordChangePanel presentationVariant="r1" />
    </div>
  );
}
