import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { sanitizeReturnTo } from "@/lib/auth-flow";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { requireProPageUser } from "@/lib/session";
import type { ProProfileResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/profile";

export default async function ProfilePage(props: {
  searchParams?: Promise<{ section?: string; returnTo?: string }>;
}) {
  const searchParams = await props.searchParams;
  const safeReturnTo = sanitizeReturnTo(searchParams?.returnTo) ?? RETURN_PATH;
  const user = await requireProPageUser(safeReturnTo);
  if (!user) {
    return <SessionGate reason="session" returnTo={safeReturnTo} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const profileResult = await fetchRemcardUpstream<ProProfileResponse>("/api/pro/profile", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  if (!profileResult.ok) {
    return (
      <SessionGate
        reason={profileResult.status === 401 ? "session" : undefined}
        returnTo={safeReturnTo}
      />
    );
  }

  return (
    <CabinetShell returnTo={safeReturnTo}>
      <PageHeading
        eyebrow="Профиль партнёра"
        title="Профиль"
        description="Контакты и описание для клиентов, статус публикации в каталоге RemCard."
      />
      <ProfileEditor
        initial={profileResult.data}
        moderationSection={searchParams?.section === "moderation"}
        returnTo={safeReturnTo}
      />
    </CabinetShell>
  );
}
