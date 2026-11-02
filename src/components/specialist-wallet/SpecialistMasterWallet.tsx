"use client";

import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell } from "@/components/wallet-prototype-shell/WalletPrototypeShell";
import type { ComponentProps, ReactNode } from "react";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type RequisitesPanelProps = ComponentProps<typeof AgentPayoutRequisitesPanel>;

const walletRequisitesProps = { variant: "wallet" } as RequisitesPanelProps;

type Props = {
  /** Override settlements tab content (dev-fixture preview). */
  settlementsSlot?: ReactNode;
};

export function SpecialistMasterWallet({ settlementsSlot }: Props) {
  return (
    <WalletPrototypeShell
      shellTestId="specialist-master-wallet"
      settlementsTabTestId="specialist-wallet-tab-settlements"
      requisitesTabTestId="specialist-wallet-tab-requisites"
      requisitesScopeTestId="specialist-wallet-requisites-scope"
      settlements={settlementsSlot ?? <SpecialistSettlementsWorkspace />}
      requisites={
        <div className={`${agentStyles.agentScope} ${walletStyles.requisitesScope}`}>
          <AgentPayoutRequisitesPanel {...walletRequisitesProps} />
        </div>
      }
    />
  );
}
