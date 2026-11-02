"use client";

import type { BusinessClientsPartnerType } from "@/lib/business-clients/gate";
import { businessWalletPageCopy } from "@/lib/business-wallet/copy";
import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell } from "@/components/wallet-prototype-shell/WalletPrototypeShell";
import type { ComponentProps, ReactNode } from "react";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type RequisitesPanelProps = ComponentProps<typeof AgentPayoutRequisitesPanel>;

const walletRequisitesProps = { variant: "wallet" } as RequisitesPanelProps;

type Props = {
  partnerType: BusinessClientsPartnerType;
  /** Stable owner id for settlements load / modal cleanup (not only STORE vs COMPANY). */
  ownerUserId: string;
  settlementsSlot?: ReactNode;
};

export function BusinessOwnerWallet({ partnerType, ownerUserId, settlementsSlot }: Props) {
  const copy = businessWalletPageCopy(partnerType);

  const workspace =
    settlementsSlot ?? (
      <SpecialistSettlementsWorkspace
        scopeKey={`${partnerType}:${ownerUserId}`}
        payableSummaryLabel={copy.payableSummaryLabel}
        payableDirectionLabel={copy.payableDirectionLabel}
        payableHint={copy.payableHint}
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
          <AgentPayoutRequisitesPanel {...walletRequisitesProps} />
        </div>
      }
    />
  );
}
