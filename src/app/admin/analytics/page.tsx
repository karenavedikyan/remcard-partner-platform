import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import { AdminR1AnalyticsClient } from "./AdminR1AnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireProfPlatformAdmin("/admin/analytics");
  return <AdminR1AnalyticsClient />;
}
