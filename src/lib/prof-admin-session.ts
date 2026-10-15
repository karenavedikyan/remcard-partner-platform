import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthMeServer } from "@/lib/remcard-server";
import type { AuthUser } from "@/lib/types";

export async function requireProfPlatformAdmin(returnTo: string): Promise<AuthUser> {
  const cookieHeader = (await headers()).get("cookie");
  const auth = await getAuthMeServer(cookieHeader);
  if (!auth.ok || !auth.data.user?.staffRole) {
    redirect(`/login?mode=admin&returnTo=${encodeURIComponent(returnTo)}`);
  }
  const role = auth.data.user.staffRole;
  if (role !== "ADMIN" && role !== "OWNER") {
    redirect("/?reason=role");
  }
  return auth.data.user;
}
