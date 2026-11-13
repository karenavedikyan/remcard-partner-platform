/**
 * P4 navigation glue (Root contract). No arbitrary returnTo / external URLs.
 */

const RECEIVING_DIRECTION = "receiving" as const;

export function buildReceivingAppealOrderPipelineHref(appealId: string): string {
  const trimmed = appealId.trim();
  if (!trimmed) {
    throw new Error("appealId required");
  }
  const params = new URLSearchParams({ appealId: trimmed });
  return `/scanner?${params.toString()}`;
}

export function receivingAppealReturnHref(appealId: string): string {
  const trimmed = appealId.trim();
  if (!trimmed) {
    throw new Error("appealId required");
  }
  const params = new URLSearchParams({
    direction: RECEIVING_DIRECTION,
    appealId: trimmed,
  });
  return `/clients?${params.toString()}`;
}

export function parseReceivingAppealIdFromSearch(
  searchParams: URLSearchParams | { get(name: string): string | null },
): string | null {
  const raw = searchParams.get("appealId");
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

export function receivingAppealPurchaseDetailHref(orderId: string): string {
  const trimmed = orderId.trim();
  if (!trimmed) {
    throw new Error("orderId required");
  }
  return `/history/purchases/${encodeURIComponent(trimmed)}`;
}

export function receivingAppealPurchaseDetailHrefWithReturn(
  orderId: string,
  appealId: string,
): string {
  const base = receivingAppealPurchaseDetailHref(orderId);
  const params = new URLSearchParams({
    receivingAppealId: appealId.trim(),
  });
  return `${base}?${params.toString()}`;
}
