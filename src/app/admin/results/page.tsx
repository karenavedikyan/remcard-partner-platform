import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import { AdminR1ResultsClient } from "./AdminR1ResultsClient";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireProfPlatformAdmin("/admin/results");
  return <AdminR1ResultsClient />;
}
