import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import { AdminR1SettingsClient } from "./AdminR1SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireProfPlatformAdmin("/admin/settings");
  return <AdminR1SettingsClient />;
}
