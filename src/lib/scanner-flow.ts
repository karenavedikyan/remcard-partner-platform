import type { OrderPreviewAllowed, OrderPreviewDenied } from "@/lib/order-types";

export type PreviewSession = {
  code: string;
  preview: OrderPreviewAllowed | OrderPreviewDenied;
  /** Operating branch used for this preview (scoped staff only). */
  branchId?: string;
};

/** Apply preview response only if it belongs to the latest in-flight request. */
export function shouldApplyPreviewResponse(
  responseRequestId: number,
  latestRequestId: number,
  signal: AbortSignal | undefined,
  responseBranchId?: string | null,
  requestBranchId?: string | null,
): boolean {
  if (signal?.aborted) {
    return false;
  }
  if (responseRequestId !== latestRequestId) {
    return false;
  }
  const norm = (value: string | null | undefined) => value?.trim() || null;
  return norm(responseBranchId) === norm(requestBranchId);
}

export function isPreviewSessionAllowed(
  session: PreviewSession | null,
): session is PreviewSession & { preview: OrderPreviewAllowed } {
  return Boolean(session && session.preview.allowed);
}
