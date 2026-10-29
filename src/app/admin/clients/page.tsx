import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import { AdminR1ClientsClient } from "./AdminR1ClientsClient";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  await requireProfPlatformAdmin("/admin/clients");
  return <AdminR1ClientsClient />;
}
