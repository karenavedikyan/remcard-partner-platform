import { AdminTestUsersClient } from "./AdminTestUsersClient";
import { requireProfPlatformAdmin } from "@/lib/prof-admin-session";

export const dynamic = "force-dynamic";

export default async function AdminTestUsersPage() {
  await requireProfPlatformAdmin("/admin/test-users");
  return <AdminTestUsersClient />;
}
