"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import { fetchWalletPayoutRegister } from "@/lib/wallet-payout-register/api";
import type { WalletPayoutRegisterResponse } from "@/lib/wallet-payout-register/types";
import { fetchAuthMeSafe } from "@/lib/auth-session";
import { resolveWalletPresentationForSession } from "@/lib/wallet-accruals/presentation-session";
import type { WalletPresentation } from "@/lib/wallet-accruals/types";
import { WalletPayoutRegisterShell } from "./WalletPayoutRegisterShell";
import { WalletSectionEmptyState } from "@/components/wallet-empty/WalletSectionEmptyState";

type Props = {
  scopeKey?: string;
  walletLedgerBranchIds?: string[] | null;
  accessBlockedMessage?: string | null;
  fallbackRibbon?: string;
  initialCounterpartyId?: string | null;
  initialRequestId?: string | null;
  initialReceiptId?: string | null;
};

export function WalletPayoutRegisterWorkspace({
  scopeKey,
  walletLedgerBranchIds = null,
  accessBlockedMessage = null,
  fallbackRibbon = "Кошелёк",
  initialCounterpartyId = null,
  initialRequestId = null,
  initialReceiptId = null,
}: Props) {
  const [data, setData] = useState<WalletPayoutRegisterResponse | null>(null);
  const [presentation, setPresentation] = useState<WalletPresentation>({
    ribbonLabel: fallbackRibbon,
    cardIdentifier: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const branchId = walletLedgerBranchIds?.length === 1 ? walletLedgerBranchIds[0] : null;
      const [response, me] = await Promise.all([
        fetchWalletPayoutRegister(branchId),
        fetchAuthMeSafe(),
      ]);
      const pres = resolveWalletPresentationForSession(me.ok ? me.data : null, {
        fallbackRibbon,
      });
      setData(response);
      setPresentation(pres);
    } catch (caught) {
      if (caught instanceof RemcardApiError && caught.status === 403) {
        setError("Нет доступа к выплатам.");
      } else {
        setError(caught instanceof Error ? caught.message : "Не удалось загрузить выплаты");
      }
    } finally {
      setLoading(false);
    }
  }, [fallbackRibbon, walletLedgerBranchIds]);

  useEffect(() => {
    if (accessBlockedMessage) return;
    void load();
  }, [accessBlockedMessage, load, scopeKey]);

  if (accessBlockedMessage) {
    return (
      <p className="pw-muted" role="status">
        {accessBlockedMessage}
      </p>
    );
  }

  if (loading && !data) {
    return <p className="pw-muted">Загрузка выплат…</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!data) {
    return <WalletSectionEmptyState role="specialist" />;
  }

  return (
    <WalletPayoutRegisterShell
      data={data}
      presentation={presentation}
      onRefresh={load}
      initialCounterpartyId={initialCounterpartyId}
      initialRequestId={initialRequestId}
      initialReceiptId={initialReceiptId}
    />
  );
}