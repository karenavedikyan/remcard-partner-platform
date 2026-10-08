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

const PROFILE_SECTIONS = new Set([
  "basics",
  "branches",
  "team",
  "catalog",
  "notifications",
]);

export default async function ProfilePage(props: {
  searchParams?: Promise<{
    section?: string;
    returnTo?: string;
    moderation?: string;
    branchId?: string;
    organizationId?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const safeReturnTo = sanitizeReturnTo(searchParams?.returnTo) ?? RETURN_PATH;
  const sectionRaw = searchParams?.section;
  const section =
    sectionRaw === "moderation"
      ? "catalog"
      : sectionRaw && PROFILE_SECTIONS.has(sectionRaw)
        ? (sectionRaw as "basics" | "branches" | "team" | "catalog" | "notifications")
        : undefined;
  const moderationSection = searchParams?.moderation === "1" || sectionRaw === "moderation";
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
        description="Рабочие данные для партнёрства, филиалы, команда и добровольная публикация в каталоге RemCard."
      />
      <ProfileEditor
        initial={profileResult.data}
        moderationSection={moderationSection}
        section={section}
        focusBranchId={searchParams?.branchId}
        returnTo={safeReturnTo}
      />
    </CabinetShell>
  );
}
