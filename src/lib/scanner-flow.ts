import { RemcardApiError } from "@/lib/api-client";
import type { OrderPreviewAllowed, OrderPreviewDenied } from "@/lib/order-types";

export const UNCERTAIN_ORDER_HEADING = "Результат неизвестен: покупка могла сохраниться";

export const UNCERTAIN_ORDER_DETAIL =
  "Ответ сервера не получен. Повторное подтверждение этой попытки заблокировано. " +
  "На backend нет идемпотентности для POST /api/store/order — это блокер безопасного production-выпуска.";

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

/** True for network failure, timeout proxy (504), and HTTP 5xx after order POST. */
export function isUncertainOrderFailure(error: unknown): boolean {
  if (error instanceof RemcardApiError) {
    return error.status === 0 || error.status >= 500;
  }
  return true;
}

export function isPreviewSessionAllowed(
  session: PreviewSession | null,
): session is PreviewSession & { preview: OrderPreviewAllowed } {
  return Boolean(session && session.preview.allowed);
}
