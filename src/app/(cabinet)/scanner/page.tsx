import { Suspense } from "react";
import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScannerHubWithAppeal } from "@/components/scanner/ScannerHubWithAppeal";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/scanner";

export default async function ScannerPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Сканер"
        description="Сканируйте QR или введите код, проверьте документ и подтвердите покупку."
      />
      <Suspense fallback={<p data-testid="ca-scanner-loading">Загрузка…</p>}>
        <ScannerHubWithAppeal userId={user.id} />
      </Suspense>
    </CabinetShell>
  );
}
