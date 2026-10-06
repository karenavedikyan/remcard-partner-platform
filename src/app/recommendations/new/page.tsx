import { SessionGate } from "@/components/auth/SessionGate";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { CertificateCreateForm } from "@/components/recommendations/CertificateCreateForm";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewRecommendationPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "PRO") {
    return <SessionGate reason={user ? "role" : "session"} />;
  }

  return (
    <CabinetShell>
      <PageHeading
        eyebrow="Новая рекомендация"
        title="Создать документ для клиента"
        description="Выберите партнёров и укажите скидку — условия проверит сервер."
      />
      <CertificateCreateForm />
    </CabinetShell>
  );
}
