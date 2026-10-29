import { headers } from "next/headers";
import { getAuthMeServer } from "@/lib/remcard-server";
import { AdminHeader } from "./AdminHeader";
import type { AdminAccountIdentity } from "./AdminAccountControls";
import styles from "./Admin.module.css";

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
  return (
    <div className={styles.shell} data-admin-shell="a1">
      <AdminHeader identity={identity} />
      <main>{children}</main>
    </div>
  );
}
