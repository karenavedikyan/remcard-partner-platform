import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import { AdminR1TeamClient } from "./AdminR1TeamClient";

export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  await requireProfPlatformAdmin("/admin/team");
  return <AdminR1TeamClient />;
}
