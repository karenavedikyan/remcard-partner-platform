import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { PartnersHub } from "@/components/partners/PartnersHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { getSessionUser } from "@/lib/session";
import type { ProProfileResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  const cookieHeader = headers().get("cookie");
  const profileResult = await fetchRemcardUpstream<ProProfileResponse>("/api/pro/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!profileResult.ok) {
    return <SessionGate reason={profileResult.status === 401 ? "session" : undefined} />;
  }

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="Партнёрская сеть"
        title="Мои партнёры"
        description="Список отношений, поиск и приглашения через существующие маршруты backend."
      />
      <PartnersHub meId={user.id} initialProfile={profileResult.data} />
    </CabinetShell>
  );
}
