"use client";

import { useCallback } from "react";
import { WalletPayoutRegisterShell } from "@/components/wallet-payout-register/WalletPayoutRegisterShell";
import type { WalletPayoutRegisterResponse } from "@/lib/wallet-payout-register/types";
import type { WalletPresentation } from "@/lib/wallet-accruals/types";

type Props = {
  data: WalletPayoutRegisterResponse;
  presentation: WalletPresentation;
};

export function PayoutFixtureClient({ data, presentation }: Props) {
  const onRefresh = useCallback(() => undefined, []);
  return <WalletPayoutRegisterShell data={data} presentation={presentation} onRefresh={onRefresh} />;
}