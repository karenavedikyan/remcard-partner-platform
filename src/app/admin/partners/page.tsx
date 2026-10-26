import { AdminPartnersClient } from "./AdminPartnersClient";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  await requireProfPlatformAdmin("/admin/partners");
  return <AdminPartnersClient />;
}
