import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import styles from "../../Admin.module.css";
import { AdminAccessUsersClient } from "./AdminAccessUsersClient";

export const dynamic = "force-dynamic";

/**
 * OWNER admin provisioning UI (A10/A10c). Shell requires staff login via
 * requireProfPlatformAdmin; create/list/revoke authorization is enforced by
 * backend OWNER guards on /api/pro/admin/access/users (403 for ADMIN).
 *
 * No production fixture/mock-success path — always uses the real API.
 * Entry: link from /admin/test-users — not added to frozen R1 primary nav.
 */
export default async function AdminAccessUsersPage() {
  await requireProfPlatformAdmin("/admin/access/users");
  return (
    <div className={styles.adminPage}>
      <AdminAccessUsersClient />
    </div>
  );
}
