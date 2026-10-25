import { headers } from "next/headers";
import { SessionGate } from "@/components/auth/SessionGate";
import { AgentReceivablesWallet } from "@/components/agent-r05/AgentReceivablesWallet";
import { BusinessOwnerWallet } from "@/components/business-wallet/BusinessOwnerWallet";
import { SpecialistMasterWallet } from "@/components/specialist-wallet/SpecialistMasterWallet";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { PageHeading } from "@/components/ui/PageHeading";
import { businessWalletPageCopy } from "@/lib/business-wallet/copy";
import { resolveCabinetNavMode } from "@/lib/cabinet-nav/mode";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { requireProPageUser } from "@/lib/session";
import type { AgentR05Status } from "@/lib/agent-r05/api";
import {
  businessWalletPartnerTypeFromUser,
  resolveSettlementsPageShell,
} from "@/lib/settlements-page-shell";

export const dynamic = "force-dynamic";

const RETURN_PATH = "/settlements";

export default async function SettlementsPage() {
  const user = await requireProPageUser(RETURN_PATH);
  if (!user) {
    return <SessionGate reason="session" returnTo={RETURN_PATH} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const r05Result = await fetchRemcardUpstream<AgentR05Status>("/api/pro/r05/status", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const r05Eligible =
    r05Result.ok && r05Result.data.featureEnabled && r05Result.data.eligible;
  const navMode = resolveCabinetNavMode(user);
  const shell = resolveSettlementsPageShell({
    partnerType: user.partnerType,
    partnerActivities: user.partnerActivities,
    role: user.role,
    r05Eligible,
  });
  const businessPartnerType = businessWalletPartnerTypeFromUser(user);
  const businessCopy =
    businessPartnerType && (navMode === "business-store" || navMode === "business-company")
      ? businessWalletPageCopy(businessPartnerType)
      : null;

  const eyebrow = businessCopy
    ? businessCopy.eyebrow
    : shell === "agent-r05"
      ? "АГЕНТ"
      : shell === "master-wallet"
        ? "СПЕЦИАЛИСТ"
        : "RemCard PROF";
  const title = businessCopy || shell !== "hub" ? "Кошелёк" : "Взаиморасчёты";
  const description = businessCopy
    ? businessCopy.description
    : shell === "agent-r05"
      ? "Входящие обязательства партнёров и реквизиты для получения оплаты."
      : shell === "master-wallet"
        ? "Взаиморасчёты с партнёрами в обоих направлениях и реквизиты для выплат."
        : "Открытые обязательства и завершённые выплаты между партнёрами.";

  return (
    <CabinetShell returnTo={RETURN_PATH}>
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      {shell === "agent-r05" ? (
        <AgentReceivablesWallet />
      ) : shell === "master-wallet" && businessCopy && businessPartnerType ? (
        <BusinessOwnerWallet partnerType={businessPartnerType} ownerUserId={user.id} />
      ) : shell === "master-wallet" ? (
        <SpecialistMasterWallet />
      ) : (
        <SettlementsHub />
      )}
    </CabinetShell>
  );
}
