import { headers } from "next/headers";
import { requireProSession } from "@/lib/session";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { countNeedsMyResponse } from "@/lib/partnership-rules";
import { CabinetAppShellClient } from "@/components/layout/CabinetAppShellClient";
import type { PartnershipListResponse } from "@/lib/types";

type CabinetShellProps = {
  children: React.ReactNode;
  returnTo?: string;
};

export async function CabinetShell({ children, returnTo = "/" }: CabinetShellProps) {
  const user = await requireProSession(returnTo);
  const cookieHeader = (await headers()).get("cookie");
  const list = await fetchRemcardUpstream<PartnershipListResponse>("/api/partnership/list", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const attentionCount =
    list.ok && user.id ? countNeedsMyResponse(list.data.partnerships ?? [], user.id) : 0;

  return (
    <CabinetAppShellClient user={user} incomingCount={attentionCount}>
      {children}
    </CabinetAppShellClient>
  );
}
