import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthMeServer } from "@/lib/remcard-server";
import type { AuthUser } from "@/lib/types";

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieHeader = headers().get("cookie");
  const auth = await getAuthMeServer(cookieHeader);
  if (!auth.ok || !auth.data.user) {
    return null;
  }
  return auth.data.user;
}

export async function requireProSession(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/?reason=session");
  }
  if (user.isBlocked) {
    redirect("/?reason=blocked");
  }
  if (user.role !== "PRO") {
    redirect("/?reason=role");
  }
  return user;
}
