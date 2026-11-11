"use client";

import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import { WalletAccrualsWorkspace } from "@/components/wallet-accruals/WalletAccrualsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell } from "@/components/wallet-prototype-shell/WalletPrototypeShell";

type Props = WalletEmptyViewerProps & {
  /** Server-derived actor scope (user id); isolates cache, refresh, and remount per session. */
  walletScopeKey: string;
};

export function AgentReceivablesWallet({ walletEmptyViewerRole, walletScopeKey }: Props) {
  return (
    <WalletPrototypeShell
      shellTestId="agent-r05-wallet"
      settlementsTabTestId="agent-r05-tab-settlements"
      requisitesTabTestId="agent-r05-tab-requisites"
      requisitesScopeTestId="agent-r05-requisites-scope"
      settlements={
        <WalletAccrualsWorkspace
          key={walletScopeKey}
          incomingOnly
          scopeKey={walletScopeKey}
          fallbackRibbon="Агент"
          agentRegistry
          walletEmptyViewerRole={walletEmptyViewerRole}
        />
      }
      requisites={
        <div className={agentStyles.agentScope}>
          <AgentPayoutRequisitesPanel disabled variant="wallet" />
        </div>
      }
    />
  );
}
