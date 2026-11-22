"use client";

import { AgentPayoutRequisitesPanel } from "@/components/profile/agent/AgentPayoutRequisitesPanel";
import { WalletAccrualsWorkspace } from "@/components/wallet-accruals/WalletAccrualsWorkspace";
import agentStyles from "@/components/profile/agent/AgentProfileWizard.module.css";
import { WalletPrototypeShell, type WalletPrototypeTab } from "@/components/wallet-prototype-shell/WalletPrototypeShell";
import { WalletPayoutRegisterWorkspace } from "@/components/wallet-payout-register/WalletPayoutRegisterWorkspace";
import type { ReactNode } from "react";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import walletStyles from "@/components/specialist-wallet/specialist-wallet.module.css";

type Props = WalletEmptyViewerProps & {
  /** Override settlements tab content (dev-fixture preview). */
  settlementsSlot?: ReactNode;
  /** Server-derived actor scope; required for live wallet (dev fixture may omit). */
  walletScopeKey?: string;
  defaultWalletTab?: WalletPrototypeTab;
  payoutFocusCounterpartyId?: string | null;
};

export function SpecialistMasterWallet({
  settlementsSlot,
  walletEmptyViewerRole,
  walletScopeKey,
  defaultWalletTab = "settlements",
  payoutFocusCounterpartyId = null,
}: Props) {
  const resolvedScopeKey = walletScopeKey ?? "specialist:preview";
  return (
    <WalletPrototypeShell
      shellTestId="specialist-master-wallet"
      settlementsTabTestId="specialist-wallet-tab-settlements"
      payoutsTabTestId="specialist-wallet-tab-payouts"
      defaultTab={defaultWalletTab}
      requisitesTabTestId="specialist-wallet-tab-requisites"
      requisitesScopeTestId="specialist-wallet-requisites-scope"
      payouts={
        <WalletPayoutRegisterWorkspace
          key={`${resolvedScopeKey}:payouts`}
          scopeKey={resolvedScopeKey}
          initialCounterpartyId={payoutFocusCounterpartyId}
        />
      }
      settlements={
        settlementsSlot ?? (
          <WalletAccrualsWorkspace
            key={resolvedScopeKey}
            scopeKey={resolvedScopeKey}
            walletEmptyViewerRole={walletEmptyViewerRole}
            masterLedger={{ ledgerScopeKey: `${resolvedScopeKey}:ledger` }}
          />
        )
      }
      requisites={
        <div className={`${agentStyles.agentScope} ${walletStyles.requisitesScope}`}>
          <AgentPayoutRequisitesPanel variant="wallet" />
        </div>
      }
    />
  );
}
