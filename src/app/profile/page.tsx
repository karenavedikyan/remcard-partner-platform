import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { getSessionUser } from "@/lib/session";
import type { ProProfileResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  const cookieHeader = headers().get("cookie");
  const profileResult = await fetchRemcardUpstream<ProProfileResponse>("/api/pro/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!profileResult.ok) {
    return (
      <SessionGate reason={profileResult.status === 401 ? "session" : undefined} />
    );
  }

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="Профиль партнёра"
        title="Профиль"
        description="Просмотр и редактирование полей через существующий API RemCard."
      />
      <ProfileEditor initial={profileResult.data} />
    </CabinetShell>
  );
}
