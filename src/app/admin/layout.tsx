import { headers } from "next/headers";
import { getAuthMeServer } from "@/lib/remcard-server";
import type { AdminAccountIdentity } from "./AdminAccountControls";
import { AdminR1Shell } from "@/components/admin-r1/AdminR1Shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Existing per-page authorization and returnTo handling remain authoritative.
  // This lookup supplies identity only; never infer staff access from a partner profile.
  const auth = await getAuthMeServer((await headers()).get("cookie"));
  const user = auth.ok ? auth.data.user : null;
  const identity: AdminAccountIdentity | null =
    user && (user.staffRole === "ADMIN" || user.staffRole === "OWNER")
      ? { displayName: user.displayName?.trim() || "Администратор RemCard", staffRole: user.staffRole }
      : null;
  return <AdminR1Shell identity={identity}>{children}</AdminR1Shell>;
}
