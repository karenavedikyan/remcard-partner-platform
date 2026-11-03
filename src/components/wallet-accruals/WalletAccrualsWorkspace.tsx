"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgentReceivablesHub } from "@/components/agent-r05/AgentReceivablesHub";
import { SpecialistSettlementsWorkspace } from "@/components/specialist-wallet/SpecialistSettlementsWorkspace";
import { fetchAuthMeSafe } from "@/lib/auth-session";
import { RemcardApiError } from "@/lib/api-client";
import { fetchSettlements, isSettlementsAccessDenied } from "@/lib/settlements-loader";
import type { SettlementsResponse } from "@/lib/settlements-types";
import {
  applyClientIncomingOnlySettlementsView,
  publicSettlementsCoverageNote,
  toAccrualsData,
} from "@/lib/wallet-accruals/settlements-display";
import { resolveWalletPresentationForSession } from "@/lib/wallet-accruals/presentation-session";
import type { WalletAccrualsData, WalletPresentation } from "@/lib/wallet-accruals/types";
import { WalletAccrualsShell } from "@/components/wallet-accruals/WalletAccrualsShell";
import { WalletSectionEmptyState } from "@/components/wallet-empty/WalletSectionEmptyState";
import { isWalletSettlementsDataEmpty } from "@/lib/wallet-empty/is-empty";
import {
  canShowAgentWalletEmptyState,
  fetchAgentReceivablesEmptyGateSignals,
  type AgentReceivablesEmptyGateSignals,
} from "@/lib/wallet-empty/agent-history-probe";
import type { WalletEmptyViewerProps } from "@/lib/wallet-empty/viewer-role";
import { isSupportedWalletEmptyViewerRole } from "@/lib/wallet-empty/viewer-role";

export type WalletMasterLedgerOptions = {
  ledgerScopeKey?: string;
  payableSummaryLabel?: string;
  payableDirectionLabel?: string;
  payableHint?: string | null;
};

type Props = {
  incomingOnly?: boolean;
  scopeKey?: string;
  /** Dev-fixture only: parent-owned data (no fetch). */
  previewData?: SettlementsResponse;
  fallbackRibbon?: string;
  masterLedger?: WalletMasterLedgerOptions | boolean;
  agentRegistry?: boolean;
  walletEmptyViewerRole?: WalletEmptyViewerProps["walletEmptyViewerRole"];
};

type Subview = "shell" | "master-ledger" | "agent-registry";

function normalizeSettlementsResponse(
  raw: SettlementsResponse,
  incomingOnlyFlag: boolean,
): SettlementsResponse {
  return incomingOnlyFlag ? applyClientIncomingOnlySettlementsView(raw) : raw;
}

function applyResponseState(
  raw: SettlementsResponse,
  incomingOnlyFlag: boolean,
  setResponse: (r: SettlementsResponse) => void,
  setData: (d: WalletAccrualsData) => void,
) {
  const normalized = normalizeSettlementsResponse(raw, incomingOnlyFlag);
  setResponse(normalized);
  setData(toAccrualsData(normalized));
}

export function WalletAccrualsWorkspace({
  incomingOnly = false,
  scopeKey,
  previewData,
  fallbackRibbon,
  masterLedger,
  agentRegistry = false,
  walletEmptyViewerRole,
}: Props) {
  const masterLedgerEnabled = Boolean(masterLedger);
  const ledgerOptions =
    masterLedger === true
      ? {}
      : typeof masterLedger === "object"
        ? masterLedger
        : undefined;

  const [subview, setSubview] = useState<Subview>("shell");
  const [response, setResponse] = useState<SettlementsResponse | null>(
    previewData ? normalizeSettlementsResponse(previewData, incomingOnly) : null,
  );
  const [data, setData] = useState<WalletAccrualsData | null>(
    previewData ? toAccrualsData(normalizeSettlementsResponse(previewData, incomingOnly)) : null,
  );
  const [presentation, setPresentation] = useState<WalletPresentation>(() =>
    resolveWalletPresentationForSession(null, { fallbackRibbon }),
  );
  const [loading, setLoading] = useState(!previewData);
  const [error, setError] = useState("");
  const [refreshNotice, setRefreshNotice] = useState("");
  const loadGenerationRef = useRef(0);
  const hasLoadedDataRef = useRef(Boolean(previewData));
  const agentGateGenerationRef = useRef(0);
  const [agentGateSignals, setAgentGateSignals] =
    useState<AgentReceivablesEmptyGateSignals | null>(null);
  const [agentGateLoading, setAgentGateLoading] = useState(false);

  const needsAgentEmptyGate =
    agentRegistry &&
    walletEmptyViewerRole === "agent" &&
    Boolean(response && isWalletSettlementsDataEmpty(response));

  useEffect(() => {
    if (!needsAgentEmptyGate) {
      setAgentGateSignals(null);
      setAgentGateLoading(false);
      return;
    }
    const generation = ++agentGateGenerationRef.current;
    setAgentGateLoading(true);
    setAgentGateSignals(null);
    let cancelled = false;
    void fetchAgentReceivablesEmptyGateSignals().then((signals) => {
      if (cancelled || generation !== agentGateGenerationRef.current) return;
      setAgentGateSignals(signals);
      setAgentGateLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [needsAgentEmptyGate, scopeKey]);

  const fetchAndApplySettlements = useCallback(
    async (options?: { preserveDataOnError?: boolean }) => {
      const generation = ++loadGenerationRef.current;
      const preserveOnError = Boolean(options?.preserveDataOnError && hasLoadedDataRef.current);
      if (!preserveOnError) {
        setError("");
      }
      try {
        const settlements = await fetchSettlements();
        if (generation !== loadGenerationRef.current) return;
        applyResponseState(settlements, incomingOnly, setResponse, setData);
        hasLoadedDataRef.current = true;
        setRefreshNotice("");
        const me = await fetchAuthMeSafe();
        if (generation !== loadGenerationRef.current) return;
        setPresentation(
          resolveWalletPresentationForSession(me.ok ? me.data : null, { fallbackRibbon }),
        );
      } catch (err) {
        if (generation !== loadGenerationRef.current) return;
        if (preserveOnError) {
          setRefreshNotice(
            "Выплата записана, не удалось обновить данные, обновите страницу",
          );
          return;
        }
        if (isSettlementsAccessDenied(err)) {
          setError("Раздел недоступен для этого профиля.");
        } else if (err instanceof RemcardApiError) {
          setError(err.message || "Не удалось загрузить кошелёк.");
        } else {
          setError("Не удалось загрузить кошелёк.");
        }
        setResponse(null);
        setData(null);
        hasLoadedDataRef.current = false;
      } finally {
        if (generation === loadGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [fallbackRibbon, incomingOnly],
  );

  const load = useCallback(async () => {
    if (previewData) {
      applyResponseState(previewData, incomingOnly, setResponse, setData);
      setLoading(false);
      return;
    }
    setLoading(true);
    await fetchAndApplySettlements();
  }, [fetchAndApplySettlements, incomingOnly, previewData]);

  useEffect(() => {
    if (previewData) return;
    setLoading(true);
    void load();
  }, [load, scopeKey, previewData]);

  useEffect(() => {
    setSubview("shell");
  }, [scopeKey]);

  useEffect(() => {
    const onReward = () => void fetchAndApplySettlements();
    window.addEventListener("remcard:reward-changed", onReward);
    return () => window.removeEventListener("remcard:reward-changed", onReward);
  }, [fetchAndApplySettlements]);

  const returnToShell = useCallback(() => {
    void fetchAndApplySettlements();
    setSubview("shell");
  }, [fetchAndApplySettlements]);

  if (loading && !data) {
    return <p className="pw-muted" data-testid="wallet-accruals-loading">Загрузка кошелёка…</p>;
  }

  if (needsAgentEmptyGate && (agentGateLoading || agentGateSignals === null)) {
    return <p className="pw-muted" data-testid="wallet-accruals-loading">Загрузка кошелёка…</p>;
  }

  if (error || !data || !response) {
    return (
      <p className="pw-muted" data-testid="wallet-accruals-error" role="alert">
        {error || "Данные недоступны."}
      </p>
    );
  }

  if (
    !agentRegistry &&
    isSupportedWalletEmptyViewerRole(walletEmptyViewerRole) &&
    isWalletSettlementsDataEmpty(response)
  ) {
    return <WalletSectionEmptyState role={walletEmptyViewerRole} />;
  }

  if (
    needsAgentEmptyGate &&
    agentGateSignals &&
    isSupportedWalletEmptyViewerRole(walletEmptyViewerRole) &&
    canShowAgentWalletEmptyState({
      overview: agentGateSignals.overview,
      historyTotalRecords: agentGateSignals.historyTotalRecords,
      historyProbeFailed: agentGateSignals.historyProbeFailed,
      loading: false,
    })
  ) {
    return <WalletSectionEmptyState role={walletEmptyViewerRole} />;
  }

  if (subview === "master-ledger" && masterLedgerEnabled) {
    return (
      <SpecialistSettlementsWorkspace
        previewData={response}
        scopeKey={ledgerOptions?.ledgerScopeKey ?? `${scopeKey ?? "default"}:ledger`}
        skipOverview
        onBack={returnToShell}
        onDataRefresh={fetchAndApplySettlements}
        walletEmptyViewerRole={walletEmptyViewerRole}
        payableSummaryLabel={ledgerOptions?.payableSummaryLabel}
        payableDirectionLabel={ledgerOptions?.payableDirectionLabel}
        payableHint={ledgerOptions?.payableHint}
      />
    );
  }

  if (subview === "agent-registry" && agentRegistry) {
    return (
      <AgentReceivablesHub
        onBack={returnToShell}
        walletEmptyViewerRole={walletEmptyViewerRole}
        initialEmptyGateSignals={needsAgentEmptyGate ? agentGateSignals : null}
      />
    );
  }

  return (
    <WalletAccrualsShell
      data={data}
      incomingOnly={incomingOnly}
      presentation={presentation}
      onDataRefresh={fetchAndApplySettlements}
      scopeKey={scopeKey}
      coverageNote={publicSettlementsCoverageNote(response.coverageNote)}
      refreshNotice={refreshNotice || null}
      onDismissRefreshNotice={() => setRefreshNotice("")}
      onPayoutRefreshFailed={() =>
        setRefreshNotice("Выплата записана, не удалось обновить данные, обновите страницу")
      }
      onOpenMasterLedger={masterLedgerEnabled ? () => setSubview("master-ledger") : undefined}
      onOpenAgentRegistry={agentRegistry ? () => setSubview("agent-registry") : undefined}
    />
  );
}
