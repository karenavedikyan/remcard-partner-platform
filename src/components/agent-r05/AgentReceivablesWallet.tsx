"use client";

import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import { WalletAccrualsWorkspace } from "@/components/wallet-accruals/WalletAccrualsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell, type WalletPrototypeTab } from "@/components/wallet-prototype-shell/WalletPrototypeShell";
import { WalletPayoutRegisterWorkspace } from "@/components/wallet-payout-register/WalletPayoutRegisterWorkspace";

type Props = WalletEmptyViewerProps & {
  /** Server-derived actor scope (user id); isolates cache, refresh, and remount per session. */
  walletScopeKey: string;
  defaultWalletTab?: WalletPrototypeTab;
  payoutFocusCounterpartyId?: string | null;
};

export function AgentReceivablesWallet({
  walletEmptyViewerRole,
  walletScopeKey,
  defaultWalletTab = "settlements",
  payoutFocusCounterpartyId = null,
}: Props) {
  return (
    <WalletPrototypeShell
      shellTestId="agent-r05-wallet"
      settlementsTabTestId="agent-r05-tab-settlements"
      settlementsTabLabel="Начисления"
      payoutsTabTestId="agent-r05-tab-payouts"
      defaultTab={defaultWalletTab}
      requisitesTabTestId="agent-r05-tab-requisites"
      requisitesScopeTestId="agent-r05-requisites-scope"
      payouts={
        <WalletPayoutRegisterWorkspace
          key={`${walletScopeKey}:payouts`}
          scopeKey={walletScopeKey}
          fallbackRibbon="Агент"
          initialCounterpartyId={payoutFocusCounterpartyId}
        />
      }
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
