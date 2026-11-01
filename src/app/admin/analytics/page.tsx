import { Suspense } from "react";
import { AdminAnalyticsClient } from "./AdminAnalyticsClient";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireProfPlatformAdmin("/admin/analytics");
  return (
    <Suspense fallback={<p>Загрузка…</p>}>
      <AdminAnalyticsClient />
    </Suspense>
  );
}
