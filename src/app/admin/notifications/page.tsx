import { AdminNotificationsClient } from "./AdminNotificationsClient";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  await requireProfPlatformAdmin("/admin/notifications");
  return <AdminNotificationsClient />;
}
