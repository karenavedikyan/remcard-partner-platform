import { AdminModerationClient } from "./AdminModerationClient";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  await requireProfPlatformAdmin("/admin/moderation");
  return <AdminModerationClient />;
}
