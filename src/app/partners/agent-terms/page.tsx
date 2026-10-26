import Link from "next/link";
import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { PartnerAgentGeneralTermsEditor } from "@/components/partners/PartnerAgentGeneralTermsEditor";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { requireProPageUser } from "@/lib/session";
import { partnersPageReturnPath } from "@/lib/partners-return-path";

export const dynamic = "force-dynamic";

export default async function PartnerAgentTermsPage() {
  const returnPath = partnersPageReturnPath(undefined);
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const contextResult = await fetchRemcardUpstream<{ role: string }>("/api/pro/context", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });

  const role = contextResult.ok ? contextResult.data.role : null;
  const canEdit = role === "ORG_OWNER" || role === "SOLO_PARTNER";
  const readOnlyReason =
    role === "ORG_EMPLOYEE" || role === "BRANCH_MANAGER" || role === "BRANCH_EMPLOYEE"
      ? "Редактирование доступно только владельцу организации."
      : role && !canEdit
        ? "Для вашего типа кабинета публикация общих условий недоступна."
        : !contextResult.ok
          ? "Не удалось определить права доступа. Просмотр без сохранения."
          : undefined;

  return (
    <CabinetShell returnTo="/partners">
      <PageHeading
        eyebrow="Партнёры"
        title="Мои условия для агентов"
        description="Общий процент по категориям для агентов RemCard до персонального предложения."
      />
      <p>
        <Link href="/partners">← К партнёрам</Link>
      </p>
      <PartnerAgentGeneralTermsEditor canEdit={canEdit} readOnlyReason={readOnlyReason} />
    </CabinetShell>
  );
}
