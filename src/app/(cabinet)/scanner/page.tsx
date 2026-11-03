import { SessionGate } from "@/components/auth/SessionGate";
import { PageHeading } from "@/components/ui/PageHeading";
import { ScannerHub } from "@/components/scanner/ScannerHub";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/scanner";

export default async function ScannerPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <>
      <PageHeading
        eyebrow="RemCard PROF"
        title="Сканер"
        description="Сканируйте QR или введите код, проверьте документ и подтвердите покупку."
      />
      <ScannerHub userId={user.id} />
    </>
  );
}
