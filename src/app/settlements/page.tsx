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
import { businessHomeNavContextFromPresentation } from "@/lib/business-home/gate";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { requireProPageUser } from "@/lib/session";
import type { AgentR05Status } from "@/lib/agent-r05/api";
import {
  businessWalletPartnerTypeFromUser,
  resolveSettlementsPageShell,
} from "@/lib/settlements-page-shell";
import { canLinkOnboardingHistoryFromUserRole } from "@/lib/onboarding-step/history-link-eligibility";
import { resolveWalletEmptyViewerRole } from "@/lib/wallet-empty/viewer-role";
import {
  businessWalletLedgerScopeKey,
  canManageBusinessWalletRequisites,
  resolveSettlementWalletReadAccess,
  settlementWalletReadBlockedMessage,
  walletLedgerBranchIdsFromReadAuth,
} from "@/lib/business-wallet/access";
import {
  actorWalletSurfaceScopeKey,
  walletSettlementsFetchScopeKey,
} from "@/lib/settlements-fetch-scope";
import {
  buildSettlementsReturnPath,
  parseSettlementsPayoutSearchParams,
  type SettlementsSearchParamValue,
} from "@/lib/wallet-payout/settlements-return-path";

export const dynamic = "force-dynamic";

type SearchParams = {
  tab?: SettlementsSearchParamValue;
  counterparty?: SettlementsSearchParamValue;
  request?: SettlementsSearchParamValue;
  receipt?: SettlementsSearchParamValue;
};

export default async function SettlementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const payout = parseSettlementsPayoutSearchParams(sp);
  const defaultWalletTab = payout.tab;
  const payoutFocusCounterpartyId = payout.counterparty;
  const payoutFocusRequestId = payout.request;
  const payoutFocusReceiptId = payout.receipt;
  const returnPath = buildSettlementsReturnPath(sp);
  const user = await requireProPageUser(returnPath);
  if (!user) {
    return <SessionGate reason="session" returnTo={returnPath} />;
  }

  const cookieHeader = (await headers()).get("cookie");
  const r05Result = await fetchRemcardUpstream<AgentR05Status>("/api/pro/r05/status", {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  const r05Eligible =
    r05Result.ok && r05Result.data.featureEnabled && r05Result.data.eligible;
  const { presentation } = await fetchCabinetPresentationServer({ user, cookieHeader });
  const navContext = businessHomeNavContextFromPresentation(presentation);
  const navMode = resolveCabinetNavMode(user, navContext);
  const shell = resolveSettlementsPageShell({
    partnerType: user.partnerType,
    partnerActivities: user.partnerActivities,
    role: user.role,
    r05Eligible,
    workplacePartnerType: presentation.workplacePartnerType,
    navContext,
  });
  const businessPartnerType = businessWalletPartnerTypeFromUser(
    user,
    presentation.workplacePartnerType,
  );
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
  const title = "Кошелёк";
  const description = businessCopy
    ? businessCopy.description
    : shell === "agent-r05"
      ? "Начисления от партнёров и реквизиты для получения оплаты."
      : shell === "master-wallet"
        ? "Взаиморасчёты с партнёрами в обоих направлениях и реквизиты для выплат."
        : "Открытые обязательства и завершённые выплаты между партнёрами.";

  const walletEmptyViewerRole =
    resolveWalletEmptyViewerRole({
      partnerType: user.partnerType,
      partnerActivities: user.partnerActivities,
      shell,
      navMode,
    }) ?? "specialist";

  const ledgerScopeKey =
    businessPartnerType && presentation.workplacePartnerType
      ? businessWalletLedgerScopeKey({
          actorUserId: user.id,
          organizationId: presentation.proContext?.organization?.id,
          partnerType: businessPartnerType,
        })
      : null;
  const canManageRequisites = canManageBusinessWalletRequisites({
    user,
    proContext: presentation.proContext,
  });
  const walletReadAuth = resolveSettlementWalletReadAccess({
    user,
    proContext: presentation.proContext,
    contextReady: presentation.contextReady,
  });
  const settlementsAccessBlockedMessage =
    walletReadAuth.allowed === false
      ? settlementWalletReadBlockedMessage(walletReadAuth)
      : null;
  const walletLedgerBranchIds = walletLedgerBranchIdsFromReadAuth(walletReadAuth);
  const walletLedgerScopeKey = walletSettlementsFetchScopeKey(
    ledgerScopeKey ?? `${businessPartnerType ?? "wallet"}:${user.id}`,
    walletLedgerBranchIds,
  );
  const agentWalletScopeKey = actorWalletSurfaceScopeKey("agent", user.id);
  const specialistWalletScopeKey = actorWalletSurfaceScopeKey("specialist", user.id);
  const legacySettlementsScopeKey = actorWalletSurfaceScopeKey("legacy-settlements", user.id);

  return (
    <CabinetShell returnTo={returnPath}>
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      {shell === "agent-r05" ? (
        <AgentReceivablesWallet
          walletEmptyViewerRole={walletEmptyViewerRole}
          walletScopeKey={agentWalletScopeKey}
          defaultWalletTab={defaultWalletTab}
          payoutFocusCounterpartyId={payoutFocusCounterpartyId}
          payoutFocusRequestId={payoutFocusRequestId}
          payoutFocusReceiptId={payoutFocusReceiptId}
        />
      ) : shell === "master-wallet" && businessCopy && businessPartnerType ? (
        <BusinessOwnerWallet
          partnerType={businessPartnerType}
          ledgerScopeKey={walletLedgerScopeKey}
          canManageRequisites={canManageRequisites}
          walletEmptyViewerRole={walletEmptyViewerRole}
          canLinkOnboardingHistory={canLinkOnboardingHistoryFromUserRole(user.role)}
          settlementsAccessBlockedMessage={settlementsAccessBlockedMessage}
          walletLedgerBranchIds={walletLedgerBranchIds}
          defaultWalletTab={defaultWalletTab}
          payoutFocusCounterpartyId={payoutFocusCounterpartyId}
          payoutFocusRequestId={payoutFocusRequestId}
          payoutFocusReceiptId={payoutFocusReceiptId}
        />
      ) : shell === "master-wallet" ? (
        <SpecialistMasterWallet
          walletEmptyViewerRole={walletEmptyViewerRole}
          walletScopeKey={specialistWalletScopeKey}
          defaultWalletTab={defaultWalletTab}
          payoutFocusCounterpartyId={payoutFocusCounterpartyId}
          payoutFocusRequestId={payoutFocusRequestId}
          payoutFocusReceiptId={payoutFocusReceiptId}
        />
      ) : (
        <SettlementsHub
          key={legacySettlementsScopeKey}
          scopeKey={legacySettlementsScopeKey}
          walletEmptyViewerRole={walletEmptyViewerRole}
          canLinkOnboardingHistory={canLinkOnboardingHistoryFromUserRole(user.role)}
        />
      )}
    </CabinetShell>
  );
}
