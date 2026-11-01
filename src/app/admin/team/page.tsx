import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import styles from "../Admin.module.css";
import { AdminTeamClient } from "./AdminTeamClient";

export const dynamic = "force-dynamic";

/**
 * A17a R1 «Команда» — readonly list/cards over GET /api/admin/team.
 * Shell requires OWNER/ADMIN via requireProfPlatformAdmin (same realm as other
 * admin pages). Access mutations stay on /admin/access/users.
 */
export default async function AdminTeamPage() {
  await requireProfPlatformAdmin("/admin/team");
  return (
    <div className={styles.adminPageWide}>
      <AdminTeamClient />
    </div>
  );
}
