import { RemcardApiError } from "@/lib/api-client";
import type { OrderCreateResponse } from "@/lib/order-types";
import {
  ATTEMPT_CONFLICT_MESSAGE,
  classifyStoreOrderNetworkFailure,
  classifyStoreOrderPostResponse,
  type OrderPostOutcome,
} from "@/lib/store-order-attempt";

export class OrderResponseUncertainError extends Error {
  constructor(message = "Некорректный ответ сервера") {
    super(message);
    this.name = "OrderResponseUncertainError";
  }
}

export const UNCERTAIN_ORDER_HEADING = "Результат неизвестен";

export const UNCERTAIN_ORDER_DETAIL =
  "Покупка могла сохраниться. Нажмите «Проверить результат» — суммы и ключ не изменятся.";

export const IDEMPOTENCY_MISMATCH_MESSAGE = ATTEMPT_CONFLICT_MESSAGE;

export const STORAGE_SAVE_FAILED_MESSAGE =
  "Не удалось сохранить попытку покупки. Проверьте настройки браузера и повторите.";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Validate a successful POST /api/store/order payload before showing success UI. */
export function validateOrderCreateResponse(payload: unknown): OrderCreateResponse {
  if (!payload || typeof payload !== "object") {
    throw new OrderResponseUncertainError();
  }

  const record = payload as Record<string, unknown>;
  const order = record.order;
  const summary = record.summary;

  if (!order || typeof order !== "object") {
    throw new OrderResponseUncertainError();
  }

  const orderId = (order as Record<string, unknown>).id;
  if (typeof orderId !== "string" || !orderId.trim()) {
    throw new OrderResponseUncertainError();
  }

  if (!summary || typeof summary !== "object") {
    throw new OrderResponseUncertainError();
  }

  const summaryRecord = summary as Record<string, unknown>;
  if (
    !isFiniteNumber(summaryRecord.totalAmount) ||
    !isFiniteNumber(summaryRecord.discountAmount) ||
    typeof summaryRecord.isSelfScan !== "boolean"
  ) {
    throw new OrderResponseUncertainError();
  }

  return payload as OrderCreateResponse;
}

/** True for network/5xx failures and malformed successful order responses. */
export function isUncertainOrderFailure(error: unknown): boolean {
  if (error instanceof OrderResponseUncertainError) {
    return true;
  }
  if (error instanceof RemcardApiError) {
    if (error.status === 0 || error.status >= 500) {
      return true;
    }
    if (error.status >= 200 && error.status < 300) {
      return true;
    }
    return false;
  }
  return true;
}

export type OrderSubmitUiState = {
  submitting: boolean;
  orderUncertain: boolean;
  orderConflict: boolean;
  submitError: string;
  success: OrderCreateResponse | null;
  postCount: number;
};

export function canSubmitOrder(
  state: Pick<OrderSubmitUiState, "submitting" | "orderUncertain" | "orderConflict">,
): boolean {
  return !state.submitting && !state.orderUncertain && !state.orderConflict;
}

export function canCheckUncertainOrder(
  state: Pick<OrderSubmitUiState, "submitting" | "orderUncertain" | "orderConflict">,
): boolean {
  return state.orderUncertain && !state.submitting && !state.orderConflict;
}

export function isIdempotencyMismatchError(error: unknown): boolean {
  return error instanceof RemcardApiError && error.status === 409;
}

/** Preserve session attempt for manual retry (unknown result or auth loss). */
export function shouldPreserveAttemptOnError(error: unknown): boolean {
  if (isUncertainOrderFailure(error)) {
    return true;
  }
  if (error instanceof RemcardApiError && error.status === 401) {
    return true;
  }
  return false;
}

export type OrderSubmitEvent =
  | { type: "submit_start" }
  | { type: "retry_check_start" }
  | { type: "submit_success"; payload: unknown }
  | { type: "submit_error"; error: unknown; wasRetry?: boolean }
  | { type: "submit_outcome"; outcome: OrderPostOutcome; wasRetry: boolean };

function applyPostOutcome(
  state: OrderSubmitUiState,
  outcome: OrderPostOutcome,
  wasRetry: boolean,
): OrderSubmitUiState {
  switch (outcome.kind) {
    case "success": {
      try {
        const data = validateOrderCreateResponse(outcome.data);
        return {
          ...state,
          submitting: false,
          orderUncertain: false,
          orderConflict: false,
          submitError: "",
          success: data,
        };
      } catch {
        return {
          ...state,
          submitting: false,
          orderUncertain: true,
          orderConflict: false,
          submitError: "",
          success: null,
        };
      }
    }
    case "conflict":
      return {
        ...state,
        submitting: false,
        orderUncertain: false,
        orderConflict: true,
        submitError: ATTEMPT_CONFLICT_MESSAGE,
        success: null,
      };
    case "uncertain":
      return {
        ...state,
        submitting: false,
        orderUncertain: true,
        orderConflict: false,
        submitError: "",
        success: null,
      };
    case "unknown_persist":
      return {
        ...state,
        submitting: false,
        orderUncertain: true,
        orderConflict: false,
        submitError: outcome.message ?? "",
        success: null,
      };
    case "auth_required":
      return {
        ...state,
        submitting: false,
        orderUncertain: wasRetry,
        orderConflict: false,
        submitError: outcome.message,
        success: null,
      };
    case "validation_failed":
      return {
        ...state,
        submitting: false,
        orderUncertain: false,
        orderConflict: false,
        submitError: outcome.message,
        success: null,
      };
    default:
      return { ...state, submitting: false };
  }
}

function remcardErrorToOutcome(error: unknown, wasRetry: boolean): OrderPostOutcome {
  if (error instanceof RemcardApiError) {
    const payload = error.body ?? (error.message ? { error: error.message } : null);
    return classifyStoreOrderPostResponse({
      status: error.status,
      payload,
      wasRetry,
    });
  }
  if (error instanceof OrderResponseUncertainError) {
    return wasRetry ? { kind: "unknown_persist" } : { kind: "uncertain" };
  }
  return classifyStoreOrderNetworkFailure(wasRetry);
}

/** Reducer-style helper mirroring ScannerHub order submit transitions. */
export function reduceOrderSubmitState(
  state: OrderSubmitUiState,
  event: OrderSubmitEvent,
): OrderSubmitUiState {
  switch (event.type) {
    case "submit_start":
      if (!canSubmitOrder(state)) {
        return state;
      }
      return {
        ...state,
        submitting: true,
        submitError: "",
        orderUncertain: false,
        postCount: state.postCount + 1,
      };
    case "retry_check_start":
      if (!canCheckUncertainOrder(state)) {
        return state;
      }
      return {
        ...state,
        submitting: true,
        submitError: "",
        postCount: state.postCount + 1,
      };
    case "submit_outcome":
      return applyPostOutcome(state, event.outcome, event.wasRetry);
    case "submit_success": {
      const outcome = classifyStoreOrderPostResponse({
        status: 201,
        payload: event.payload,
        wasRetry: false,
      });
      return applyPostOutcome(state, outcome, false);
    }
    case "submit_error": {
      const wasRetry = event.wasRetry ?? false;
      return applyPostOutcome(state, remcardErrorToOutcome(event.error, wasRetry), wasRetry);
    }
    default:
      return state;
  }
}
