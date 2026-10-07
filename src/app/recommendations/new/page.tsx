import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";
import { requireProPageUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/recommendations/new";

export default async function NewRecommendationPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading
        eyebrow="Новая рекомендация"
        title="Создать документ для клиента"
        description="Выберите партнёров и укажите скидку — условия проверит сервер."
      />
      <CertificateCreateForm />
    </CabinetShell>
  );
}
