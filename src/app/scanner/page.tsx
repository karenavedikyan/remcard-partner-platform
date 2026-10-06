import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScannerHub } from "@/components/scanner/ScannerHub";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ScannerPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Сканер"
        description="Сканируйте QR или введите код, проверьте документ и подтвердите покупку."
      />
      <ScannerHub userId={user.id} />
    </CabinetShell>
  );
}
