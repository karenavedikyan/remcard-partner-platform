import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BusinessOwnerWallet } from "@/components/business-wallet/BusinessOwnerWallet";
import { SettlementsHub } from "@/components/settlements/SettlementsHub";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
import { masterWalletFixtureData } from "@/lib/specialist-settlements/fixture-data";
import { walletSettlementsFetchScopeKey } from "@/lib/settlements-fetch-scope";
import {
  QA_STAFF_WALLET_BRANCH_IDS,
} from "./mocks/company-wallet-fixtures";
import "@/app/globals.css";

const params = new URLSearchParams(window.location.search);
const scene = params.get("scene") ?? "hub-overview";
const theme = params.get("theme") ?? "light";
const openCompleted = params.get("completed") === "1";
document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";

const COMPLETED_HISTORY_SELECTOR = '[data-testid="settlements-completed-history"]';

function HubWithCompleted() {
  useEffect(() => {
    if (!openCompleted) return;
    let cancelled = false;
    const openWhenReady = () => {
      if (cancelled) return;
      const btn = document.querySelector<HTMLButtonElement>(COMPLETED_HISTORY_SELECTOR);
      if (btn) {
        btn.click();
        return;
      }
      window.requestAnimationFrame(openWhenReady);
    };
    openWhenReady();
    return () => {
      cancelled = true;
    };
  }, []);

  return <SettlementsHub />;
}

function SpecialistPartners() {
  return (
    <SpecialistSettlementsWorkspace previewData={masterWalletFixtureData()} scopeKey="qa-partners" />
  );
}

function CompanyWalletHarness(input: {
  branchIds?: string[];
  staff?: boolean;
  testId: string;
}) {
  const baseKey = "COMPANY:org-optovik-qa:actor-qa-staff";
  const scopeKey = walletSettlementsFetchScopeKey(baseKey, input.branchIds);
  return (
    <div data-testid={input.testId}>
      <BusinessOwnerWallet
        partnerType="COMPANY"
        ledgerScopeKey={scopeKey}
        canManageRequisites={!input.staff}
        walletEmptyViewerRole="company"
        walletLedgerBranchIds={input.branchIds ?? null}
      />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
let node: React.ReactNode = null;

if (scene === "company-owner") {
  node = (
    <CompanyWalletHarness testId="qa-company-wallet-owner" staff={false} />
  );
} else if (scene === "company-staff-6") {
  node = (
    <CompanyWalletHarness
      testId="qa-company-wallet-staff-6"
      staff
      branchIds={[...QA_STAFF_WALLET_BRANCH_IDS]}
    />
  );
} else if (scene === "company-staff-1") {
  node = (
    <CompanyWalletHarness testId="qa-company-wallet-staff-1" staff branchIds={["branch-b1"]} />
  );
} else if (scene === "company-staff-403") {
  node = (
    <CompanyWalletHarness
      testId="qa-company-wallet-staff-403"
      staff
      branchIds={[...QA_STAFF_WALLET_BRANCH_IDS]}
    />
  );
} else if (scene.startsWith("hub")) {
  node = openCompleted ? <HubWithCompleted /> : <SettlementsHub />;
} else if (scene.startsWith("specialist-partners")) {
  node = <SpecialistPartners />;
} else if (scene.startsWith("specialist")) {
  node = <SpecialistSettlementsWorkspace previewData={masterWalletFixtureData()} scopeKey="qa" />;
} else if (scene.startsWith("agent")) {
  node = <AgentReceivablesHub />;
}

root.render(
  <div
    data-scene={scene}
    style={{ padding: 16, maxWidth: scene.includes("375") ? 375 : 1280, margin: "0 auto" }}
  >
    {node}
  </div>,
);
