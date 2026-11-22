import { remcardFetch } from "@/lib/api-client";
import type { WalletPayoutRegisterResponse } from "./types";

export async function fetchWalletPayoutRegister(branchId?: string | null) {
  const q = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  return remcardFetch<WalletPayoutRegisterResponse>(`/api/pro/wallet/payout-register${q}`);
}

export async function requestWalletPayoutCode(input: {
  counterpartyUserId: string;
  amountRub: string;
  idempotencyKey: string;
}) {
  return remcardFetch<{ requestId: string; replay: boolean }>(
    "/api/pro/wallet/payout-register/request-code",
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        counterpartyUserId: input.counterpartyUserId,
        amountRub: input.amountRub,
      },
    },
  );
}

export async function approveWalletPayout(requestId: string) {
  return remcardFetch<{ ok: boolean }>("/api/pro/wallet/payout-register/approve", {
    method: "POST",
    body: { requestId },
  });
}

export async function rejectWalletPayout(requestId: string) {
  return remcardFetch<{ ok: boolean }>("/api/pro/wallet/payout-register/reject", {
    method: "POST",
    body: { requestId },
  });
}

export async function revealWalletPayoutCode(requestId: string) {
  return remcardFetch<{ code: string; amountKopecks: number }>(
    "/api/pro/wallet/payout-register/reveal-code",
    { method: "POST", body: { requestId } },
  );
}

export async function writeoffWalletPayout(input: {
  requestId: string;
  code: string;
  idempotencyKey: string;
}) {
  return remcardFetch<{ ok: boolean; replay: boolean }>(
    "/api/pro/wallet/payout-register/writeoff",
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: { requestId: input.requestId, code: input.code },
    },
  );
}

export function formatKopecks(kopecks: number): string {
  return `${(kopecks / 100).toLocaleString("ru-RU")} ₽`;
}

export function newWalletPayoutIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `wallet-payout.${prefix}.${crypto.randomUUID()}`;
  }
  return `wallet-payout.${prefix}.${Date.now()}`;
}