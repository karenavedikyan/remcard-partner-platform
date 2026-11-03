"use client";

import type { BusinessClientsPartnerType } from "@/lib/business-clients/gate";
import { businessWalletPageCopy } from "@/lib/business-wallet/copy";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { WalletAccrualsWorkspace } from "@/components/wallet-accruals/WalletAccrualsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell } from "@/components/wallet-prototype-shell/WalletPrototypeShell";
import type { ReactNode } from "react";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type Props = WalletEmptyViewerProps & {
  partnerType: BusinessClientsPartnerType;
  /** Stable owner id for settlements load / modal cleanup (not only STORE vs COMPANY). */
  ownerUserId: string;
  settlementsSlot?: ReactNode;
  canLinkOnboardingHistory?: boolean;
};

export function BusinessOwnerWallet({
  partnerType,
  ownerUserId,
  settlementsSlot,
  walletEmptyViewerRole,
  canLinkOnboardingHistory,
}: Props) {
  const copy = businessWalletPageCopy(partnerType);

  const workspace =
    settlementsSlot ?? (
      <WalletAccrualsWorkspace
        scopeKey={`${partnerType}:${ownerUserId}`}
        walletEmptyViewerRole={walletEmptyViewerRole}
        canLinkOnboardingHistory={canLinkOnboardingHistory}
        fallbackRibbon={copy.eyebrow}
        masterLedger={{
          ledgerScopeKey: `${partnerType}:${ownerUserId}:ledger`,
          payableSummaryLabel: copy.payableSummaryLabel,
          payableDirectionLabel: copy.payableDirectionLabel,
          payableHint: copy.payableHint,
        }}
      />
    );

  return (
    <WalletPrototypeShell
      shellTestId="business-owner-wallet"
      settlementsTabTestId="business-wallet-tab-settlements"
      requisitesTabTestId="business-wallet-tab-requisites"
      requisitesScopeTestId="business-wallet-requisites-scope"
      settlements={workspace}
      requisites={
        <div className={`${agentStyles.agentScope} ${walletStyles.requisitesScope}`}>
          <AgentPayoutRequisitesPanel variant="wallet" />
        </div>
      }
    />
  );
}
