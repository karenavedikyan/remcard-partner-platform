import { headers } from "next/headers";
import { requireProSession } from "@/lib/session";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { AppShell } from "@/components/layout/AppShell";

type CabinetShellProps = {
  children: React.ReactNode;
};

export async function CabinetShell({ children }: CabinetShellProps) {
  const user = await requireProSession();
  const cookieHeader = headers().get("cookie");
  const incoming = await fetchRemcardUpstream<{ count: number }>(
    "/api/partnership/incoming-count",
    { headers: cookieHeader ? { cookie: cookieHeader } : undefined },
  );

  return (
    <AppShell user={user} incomingCount={incoming.ok ? incoming.data.count : 0}>
      {children}
    </AppShell>
  );
}
