import { CabinetShell } from "@/components/layout/CabinetShell";
import { ProfNotificationCenter } from "@/components/notifications/ProfNotificationCenter";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";
import { SessionGate } from "@/components/auth/SessionGate";

export const dynamic = "force-dynamic";

const FOCUS_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ focus?: string | string[] }>;
}) {
  const rawFocus = (await searchParams)?.focus;
  const focusCandidate = Array.isArray(rawFocus) ? rawFocus[0] : rawFocus;
  const focusId = focusCandidate && FOCUS_ID_PATTERN.test(focusCandidate) ? focusCandidate : null;
  const returnPath = focusId ? `/notifications?focus=${focusId}` : "/notifications";
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading eyebrow="RemCard PROF" title="Уведомления" />
      <ProfNotificationCenter focusId={focusId} />
    </CabinetShell>
  );
}
