/**
 * Root handoff — appeal-scoped relative paths only (no arbitrary returnTo / external URL).
 * P6 scanner/workspace consumes the same query keys; P4 does not fetch or link orders.
 */

export const RECEIVING_APPEAL_CONTEXT_QUERY_KEY = "appealId" as const;

export const RECEIVING_CLIENTS_RECEIVING_DIRECTION = "receiving" as const;

export const RECEIVING_APPEAL_NAVIGATION_INVALID = "RECEIVING_APPEAL_NAVIGATION_INVALID" as const;

export type ReceivingAppealNavigationError = {
  code: typeof RECEIVING_APPEAL_NAVIGATION_INVALID;
  message: string;
};

const UNSAFE_ID = /[\s#?&/\\]|^(?:https?:|\/\/)/i;

export function assertReceivingAppealId(appealId: string): string {
  const id = appealId.trim();
  if (!id) {
    throw Object.assign(new Error("appealId is required"), {
      code: RECEIVING_APPEAL_NAVIGATION_INVALID,
    } satisfies ReceivingAppealNavigationError);
  }
  if (UNSAFE_ID.test(id)) {
    throw Object.assign(new Error("appealId contains unsafe characters"), {
      code: RECEIVING_APPEAL_NAVIGATION_INVALID,
    } satisfies ReceivingAppealNavigationError);
  }
  return id;
}

function assertPurchaseOrderId(purchaseOrderId: string): string {
  const id = purchaseOrderId.trim();
  if (!id) {
    throw Object.assign(new Error("purchaseOrderId is required"), {
      code: RECEIVING_APPEAL_NAVIGATION_INVALID,
    } satisfies ReceivingAppealNavigationError);
  }
  if (UNSAFE_ID.test(id)) {
    throw Object.assign(new Error("purchaseOrderId contains unsafe characters"), {
      code: RECEIVING_APPEAL_NAVIGATION_INVALID,
    } satisfies ReceivingAppealNavigationError);
  }
  return id;
}

/** Entry from receiving detail into existing scanner order pipeline. */
export function buildReceivingAppealOrderPipelineHref(appealId: string): string {
  const id = assertReceivingAppealId(appealId);
  const qs = new URLSearchParams({ [RECEIVING_APPEAL_CONTEXT_QUERY_KEY]: id });
  return `/scanner?${qs.toString()}`;
}

/** Return to the same receiving appeal card after scanner / purchase flow. */
export function receivingAppealReturnHref(appealId: string): string {
  const id = assertReceivingAppealId(appealId);
  const qs = new URLSearchParams({
    direction: RECEIVING_CLIENTS_RECEIVING_DIRECTION,
    [RECEIVING_APPEAL_CONTEXT_QUERY_KEY]: id,
  });
  return `/clients?${qs.toString()}`;
}

/** Wallet purchase detail; optional appeal context for safe return (same query key). */
export function receivingAppealPurchaseDetailHref(
  purchaseOrderId: string,
  appealId?: string | null,
): string {
  const orderId = assertPurchaseOrderId(purchaseOrderId);
  const base = `/history/purchases/${encodeURIComponent(orderId)}`;
  if (appealId == null || appealId === "") return base;
  const id = assertReceivingAppealId(appealId);
  const qs = new URLSearchParams({ [RECEIVING_APPEAL_CONTEXT_QUERY_KEY]: id });
  return `${base}?${qs.toString()}`;
}
