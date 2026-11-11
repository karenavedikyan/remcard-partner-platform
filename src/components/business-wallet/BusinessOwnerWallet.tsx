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
  /** Cache/remount scope (includes actor session id, never organization.ownerId). */
  ledgerScopeKey: string;
  canManageRequisites?: boolean;
  settlementsSlot?: ReactNode;
  canLinkOnboardingHistory?: boolean;
  /** When set, skip ledger fetch and show access explanation (no fake zeros). */
  settlementsAccessBlockedMessage?: string | null;
  /** Org staff: per-branch settlements fetch + merge (owner/solo omit). */
  walletLedgerBranchIds?: string[] | null;
};

export function BusinessOwnerWallet({
  partnerType,
  ledgerScopeKey,
  canManageRequisites = true,
  settlementsSlot,
  walletEmptyViewerRole,
  canLinkOnboardingHistory,
  settlementsAccessBlockedMessage = null,
  walletLedgerBranchIds = null,
}: Props) {
  const copy = businessWalletPageCopy(partnerType);

  const workspace =
    settlementsSlot ?? (
      <WalletAccrualsWorkspace
        key={ledgerScopeKey}
        scopeKey={ledgerScopeKey}
        walletLedgerBranchIds={walletLedgerBranchIds}
        walletEmptyViewerRole={walletEmptyViewerRole}
        canLinkOnboardingHistory={canLinkOnboardingHistory}
        accessBlockedMessage={settlementsAccessBlockedMessage}
        fallbackRibbon={copy.eyebrow}
        masterLedger={{
          ledgerScopeKey: `${ledgerScopeKey}:ledger`,
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
        canManageRequisites ? (
          <div className={`${agentStyles.agentScope} ${walletStyles.requisitesScope}`}>
            <AgentPayoutRequisitesPanel variant="wallet" />
          </div>
        ) : (
          <p className="pw-muted" data-testid="business-wallet-requisites-blocked" role="status">
            Реквизиты и выплаты настраивает владелец организации. У вас нет прав на изменение.
          </p>
        )
      }
    />
  );
}
