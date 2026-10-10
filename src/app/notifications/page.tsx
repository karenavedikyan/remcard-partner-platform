import { CabinetShell } from "@/components/layout/CabinetShell";
import { ProfNotificationCenter } from "@/components/notifications/ProfNotificationCenter";
import { PageHeading } from "@/components/ui/PageHeading";
import { requireProPageUser } from "@/lib/session";
import { SessionGate } from "@/components/auth/SessionGate";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const returnPath = "/notifications";
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading eyebrow="RemCard PROF" title="Уведомления" />
      <ProfNotificationCenter />
    </CabinetShell>
  );
}
