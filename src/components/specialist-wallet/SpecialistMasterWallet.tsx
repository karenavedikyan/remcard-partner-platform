"use client";

import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell } from "@/components/wallet-prototype-shell/WalletPrototypeShell";
import type { ReactNode } from "react";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type Props = WalletEmptyViewerProps & {
  /** Override settlements tab content (dev-fixture preview). */
  settlementsSlot?: ReactNode;
};

export function SpecialistMasterWallet({ settlementsSlot, walletEmptyViewerRole }: Props) {
  return (
    <WalletPrototypeShell
      shellTestId="specialist-master-wallet"
      settlementsTabTestId="specialist-wallet-tab-settlements"
      requisitesTabTestId="specialist-wallet-tab-requisites"
      requisitesScopeTestId="specialist-wallet-requisites-scope"
      settlements={settlementsSlot ?? <SpecialistSettlementsWorkspace walletEmptyViewerRole={walletEmptyViewerRole} />}
      requisites={
        <div className={`${agentStyles.agentScope} ${walletStyles.requisitesScope}`}>
          <AgentPayoutRequisitesPanel variant="wallet" />
        </div>
      }
    />
  );
}
