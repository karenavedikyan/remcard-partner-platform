import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import styles from "../Admin.module.css";
import { AdminClientsClient } from "./AdminClientsClient";

export const dynamic = "force-dynamic";

/**
 * A21a R1 «Клиенты» — readonly list/cards over GET /api/admin/users?role=CLIENT.
 * Shell requires OWNER/ADMIN via requireProfPlatformAdmin. No create/edit/delete.
 */
export default async function AdminClientsPage() {
  await requireProfPlatformAdmin("/admin/clients");
  return (
    <div className={styles.adminPageWide}>
      <AdminClientsClient />
    </div>
  );
}
