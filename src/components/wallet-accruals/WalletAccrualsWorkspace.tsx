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
import {
  isWalletRefreshUnauthorized,
  useWalletVisibleRefresh,
  WALLET_PAYOUT_STALE_NOTICE,
  WALLET_STALE_DATA_NOTICE,
  type WalletRefreshReason,
} from "@/lib/wallet-data-refresh";

export type WalletMasterLedgerOptions = {
  ledgerScopeKey?: string;
  payableSummaryLabel?: string;
  payableDirectionLabel?: string;
  payableHint?: string | null;
};

type Props = {
  incomingOnly?: boolean;
  scopeKey?: string;
  /** Org staff granted branches — per-branch GET + merge; owner/solo omit. */
  walletLedgerBranchIds?: string[] | null;
  /** Dev-fixture only: parent-owned data (no fetch). */
  previewData?: SettlementsResponse;
  fallbackRibbon?: string;
  masterLedger?: WalletMasterLedgerOptions | boolean;
  agentRegistry?: boolean;
  walletEmptyViewerRole?: WalletEmptyViewerProps["walletEmptyViewerRole"];
  canLinkOnboardingHistory?: boolean;
  accessBlockedMessage?: string | null;
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
  walletLedgerBranchIds = null,
  previewData,
  fallbackRibbon,
  masterLedger,
  agentRegistry = false,
  walletEmptyViewerRole,
  canLinkOnboardingHistory,
  accessBlockedMessage = null,
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
  const [backgroundRefreshEnabled, setBackgroundRefreshEnabled] = useState(true);
  const loadGenerationRef = useRef(0);
  const loadScopeRef = useRef(scopeKey ?? "default");
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
    async (options?: {
      preserveDataOnError?: boolean;
      background?: boolean;
      staleNotice?: string;
    }) => {
      const scopeAtStart = loadScopeRef.current;
      const generation = ++loadGenerationRef.current;
      const background = Boolean(options?.background);
      const preserveOnError = Boolean(
        (options?.preserveDataOnError || background) && hasLoadedDataRef.current,
      );
      if (!preserveOnError) {
        setError("");
      }
      if (!background || !hasLoadedDataRef.current) {
        setLoading(true);
      }
      try {
        const settlements = await fetchSettlements(
          walletLedgerBranchIds?.length
            ? { walletLedgerBranchIds }
            : undefined,
        );
        if (generation !== loadGenerationRef.current || scopeAtStart !== loadScopeRef.current) {
          return;
        }
        applyResponseState(settlements, incomingOnly, setResponse, setData);
        hasLoadedDataRef.current = true;
        setRefreshNotice("");
        setError("");
        if (!background) {
          const me = await fetchAuthMeSafe();
          if (generation !== loadGenerationRef.current || scopeAtStart !== loadScopeRef.current) {
            return;
          }
          if (!me.ok && (me.kind === "unauthorized" || me.kind === "blocked")) {
            setBackgroundRefreshEnabled(false);
            setResponse(null);
            setData(null);
            hasLoadedDataRef.current = false;
            setError(
              me.kind === "blocked"
                ? me.message ?? "Раздел недоступен для этого профиля."
                : "Сессия завершилась. Войдите снова.",
            );
            return;
          }
          setPresentation(
            resolveWalletPresentationForSession(me.ok ? me.data : null, { fallbackRibbon }),
          );
        }
      } catch (err) {
        if (generation !== loadGenerationRef.current || scopeAtStart !== loadScopeRef.current) {
          return;
        }
        if (isWalletRefreshUnauthorized(err) || isSettlementsAccessDenied(err)) {
          setBackgroundRefreshEnabled(false);
          setResponse(null);
          setData(null);
          hasLoadedDataRef.current = false;
          setError(
            isSettlementsAccessDenied(err)
              ? "Раздел недоступен для этого профиля."
              : "Сессия завершилась. Войдите снова.",
          );
          return;
        }
        if (preserveOnError) {
          setRefreshNotice(options?.staleNotice ?? WALLET_STALE_DATA_NOTICE);
          return;
        }
        if (err instanceof RemcardApiError) {
          setError(err.message || "Не удалось загрузить кошелёк.");
        } else {
          setError("Не удалось загрузить кошелёк.");
        }
        setResponse(null);
        setData(null);
        hasLoadedDataRef.current = false;
      } finally {
        if (generation === loadGenerationRef.current && scopeAtStart === loadScopeRef.current) {
          setLoading(false);
        }
      }
    },
    [fallbackRibbon, incomingOnly, walletLedgerBranchIds],
  );

  const load = useCallback(async () => {
    if (accessBlockedMessage?.trim()) {
      setError(accessBlockedMessage.trim());
      setLoading(false);
      setResponse(null);
      setData(null);
      hasLoadedDataRef.current = false;
      return;
    }
    if (previewData) {
      applyResponseState(previewData, incomingOnly, setResponse, setData);
      setLoading(false);
      return;
    }
    setLoading(true);
    await fetchAndApplySettlements();
  }, [accessBlockedMessage, fetchAndApplySettlements, incomingOnly, previewData]);

  useEffect(() => {
    const nextScope = scopeKey ?? "default";
    const scopeChanged = loadScopeRef.current !== nextScope;
    loadScopeRef.current = nextScope;
    loadGenerationRef.current += 1;
    agentGateGenerationRef.current += 1;
    setBackgroundRefreshEnabled(!previewData && !accessBlockedMessage?.trim());
    setRefreshNotice("");
    if (scopeChanged && !previewData) {
      setResponse(null);
      setData(null);
      setError("");
      setLoading(true);
      hasLoadedDataRef.current = false;
      setPresentation(resolveWalletPresentationForSession(null, { fallbackRibbon }));
      setAgentGateSignals(null);
      setAgentGateLoading(false);
    }
  }, [accessBlockedMessage, fallbackRibbon, previewData, scopeKey]);

  useEffect(() => {
    if (previewData) return;
    setLoading(true);
    void load();
  }, [accessBlockedMessage, load, scopeKey, previewData]);

  useEffect(() => {
    setSubview("shell");
  }, [scopeKey]);

  const onVisibleRefresh = useCallback(
    (_reason: WalletRefreshReason) => {
      void fetchAndApplySettlements({ background: true });
    },
    [fetchAndApplySettlements],
  );

  useWalletVisibleRefresh({
    enabled: backgroundRefreshEnabled && !previewData && !accessBlockedMessage?.trim(),
    scopeKey: scopeKey ?? "default",
    onRefresh: onVisibleRefresh,
  });

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

  if (error && !data) {
    return (
      <p className="pw-muted" data-testid="wallet-accruals-error" role="alert">
        {error || "Данные недоступны."}
      </p>
    );
  }

  if (!data || !response) {
    return (
      <p className="pw-muted" data-testid="wallet-accruals-error" role="alert">
        {error || "Данные недоступны."}
      </p>
    );
  }

  const staffMergedBranchLedger = Boolean(walletLedgerBranchIds?.length);
  // Company-wide staff unscoped GET: keep empty shell + coverage, not owner onboarding.
  const staffCompanyWideLedger = response.walletReadScope === "org-staff-company";

  if (
    !agentRegistry &&
    isSupportedWalletEmptyViewerRole(walletEmptyViewerRole) &&
    isWalletSettlementsDataEmpty(response) &&
    !staffMergedBranchLedger &&
    !staffCompanyWideLedger
  ) {
    return (
      <WalletSectionEmptyState
        role={walletEmptyViewerRole}
        canLinkOnboardingHistory={canLinkOnboardingHistory}
      />
    );
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
    return (
      <WalletSectionEmptyState
        role={walletEmptyViewerRole}
        canLinkOnboardingHistory={canLinkOnboardingHistory}
      />
    );
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
        walletLedgerBranchIds={walletLedgerBranchIds}
        disableLedgerExport={Boolean(walletLedgerBranchIds?.length)}
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
        scopeKey={`${scopeKey ?? "default"}:agent-registry`}
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
        void fetchAndApplySettlements({
          background: true,
          staleNotice: WALLET_PAYOUT_STALE_NOTICE,
        })
      }
      onOpenMasterLedger={masterLedgerEnabled ? () => setSubview("master-ledger") : undefined}
      onOpenAgentRegistry={agentRegistry ? () => setSubview("agent-registry") : undefined}
    />
  );
}
