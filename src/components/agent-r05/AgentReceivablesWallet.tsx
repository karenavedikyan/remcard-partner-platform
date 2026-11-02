"use client";

import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell } from "@/components/wallet-prototype-shell/WalletPrototypeShell";

export function AgentReceivablesWallet() {
  return (
    <WalletPrototypeShell
      shellTestId="agent-r05-wallet"
      settlementsTabTestId="agent-r05-tab-settlements"
      requisitesTabTestId="agent-r05-tab-requisites"
      requisitesScopeTestId="agent-r05-requisites-scope"
      settlements={<AgentReceivablesHub />}
      requisites={
        <div className={agentStyles.agentScope}>
          <AgentPayoutRequisitesPanel disabled variant="wallet" />
        </div>
      }
    />
  );
}
