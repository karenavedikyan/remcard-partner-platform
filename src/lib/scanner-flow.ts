import type { OrderPreviewAllowed, OrderPreviewDenied } from "@/lib/order-types";

export type PreviewSession = {
  code: string;
  preview: OrderPreviewAllowed | OrderPreviewDenied;
};

/** Apply preview response only if it belongs to the latest in-flight request. */
export function shouldApplyPreviewResponse(
  responseRequestId: number,
  latestRequestId: number,
  signal: AbortSignal | undefined,
): boolean {
  if (signal?.aborted) {
    return false;
  }
  return responseRequestId === latestRequestId;
}

export function isPreviewSessionAllowed(
  session: PreviewSession | null,
): session is PreviewSession & { preview: OrderPreviewAllowed } {
  return Boolean(session && session.preview.allowed);
}
