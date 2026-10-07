import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { PartnersHub } from "@/components/partners/PartnersHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { requireProPageUser } from "@/lib/session";
import type { ProProfileResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/partners";

export default async function PartnersPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const profileResult = await fetchRemcardUpstream<ProProfileResponse>("/api/pro/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!profileResult.ok) {
    return (
      <SessionGate
        reason={profileResult.status === 401 ? "session" : undefined}
        returnTo={RETURN_PATH}
      />
    );
  }

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="Партнёрская сеть"
        title="Мои партнёры"
        description="Список партнёров, поиск по каталогу, приглашения и согласование условий."
      />
      <PartnersHub meId={user.id} initialProfile={profileResult.data} />
    </CabinetShell>
  );
}
