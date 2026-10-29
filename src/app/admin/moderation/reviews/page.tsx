import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";
import { AdminR1ReviewsClient } from "./AdminR1ReviewsClient";

export const dynamic = "force-dynamic";

export default async function AdminReviewsModerationPage() {
  await requireProfPlatformAdmin("/admin/moderation/reviews");
  return <AdminR1ReviewsClient />;
}
