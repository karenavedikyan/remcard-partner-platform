import { displayCategoryLabel } from "@/lib/category-display";

/** Client-side purchase attempt persistence for POST /api/store/order idempotency. */

export const STORE_ORDER_ATTEMPT_STORAGE_KEY = "remcard:store-order-attempt:v1";
export const STORE_ORDER_ATTEMPT_FORMAT_VERSION = 1 as const;

export type StoreOrderAttemptItem = {
  category: string;
  categoryLabel?: string;
  amount: number;
};

export type StoreOrderAttemptBody = {
  certificateCode: string;
  items: StoreOrderAttemptItem[];
};

export type StoreOrderAttemptStatus = "in_flight" | "unknown" | "conflict" | "succeeded";

export type StoreOrderAttemptRecord = {
  version: typeof STORE_ORDER_ATTEMPT_FORMAT_VERSION;
  userId: string;
  idempotencyKey: string;
  body: StoreOrderAttemptBody;
  status: StoreOrderAttemptStatus;
  orderId?: string;
};

export type CreateAttemptResult =
  | { ok: true; record: StoreOrderAttemptRecord }
  | { ok: false; reason: "storage" | "blocked" | "body_mismatch" };

export type PrepareRetryResult =
  | { ok: true; record: StoreOrderAttemptRecord }
  | { ok: false; reason: "none" | "conflict" | "foreign_user" };

export function generateStoreOrderIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  throw new Error("crypto.randomUUID is unavailable");
}

export function normalizeStoreOrderAttemptBody(body: StoreOrderAttemptBody): StoreOrderAttemptBody {
  return {
    certificateCode: String(body.certificateCode || "").trim(),
    items: body.items
      .map((item) => ({
        category: String(item.category || "").trim(),
        categoryLabel: item.categoryLabel ? String(item.categoryLabel).trim() : undefined,
        amount: Number(item.amount),
      }))
      .filter((item) => item.category && Number.isFinite(item.amount) && item.amount > 0)
      .sort((a, b) => a.category.localeCompare(b.category) || a.amount - b.amount),
  };
}

export function storeOrderAttemptBodiesEqual(
  a: StoreOrderAttemptBody,
  b: StoreOrderAttemptBody,
): boolean {
  return (
    JSON.stringify(normalizeStoreOrderAttemptBody(a)) ===
    JSON.stringify(normalizeStoreOrderAttemptBody(b))
  );
}

function readRawAttempt(): StoreOrderAttemptRecord | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORE_ORDER_ATTEMPT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoreOrderAttemptRecord;
    if (parsed?.version !== STORE_ORDER_ATTEMPT_FORMAT_VERSION) {
      return null;
    }
    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.idempotencyKey !== "string" ||
      !parsed.body ||
      typeof parsed.body.certificateCode !== "string" ||
      !Array.isArray(parsed.body.items)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadStoreOrderAttempt(userId: string): StoreOrderAttemptRecord | null {
  const record = readRawAttempt();
  if (!record) {
    return null;
  }
  if (record.userId !== userId) {
    return null;
  }
  if (record.status === "in_flight") {
    return { ...record, status: "unknown" };
  }
  return record;
}

export function saveStoreOrderAttempt(record: StoreOrderAttemptRecord): boolean {
  if (typeof sessionStorage === "undefined") {
    return false;
  }

  try {
    sessionStorage.setItem(STORE_ORDER_ATTEMPT_STORAGE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearStoreOrderAttempt(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.removeItem(STORE_ORDER_ATTEMPT_STORAGE_KEY);
}

/** New purchase attempt — always a fresh key; never overwrites an open attempt. */
export function createStoreOrderAttempt(params: {
  userId: string;
  body: StoreOrderAttemptBody;
}): CreateAttemptResult {
  const normalizedBody = normalizeStoreOrderAttemptBody(params.body);
  if (!normalizedBody.certificateCode || normalizedBody.items.length === 0) {
    return { ok: false, reason: "storage" };
  }

  const existing = loadStoreOrderAttempt(params.userId);
  if (existing) {
    if (existing.status === "conflict") {
      return { ok: false, reason: "blocked" };
    }
    if (existing.status === "unknown" || existing.status === "in_flight") {
      if (!storeOrderAttemptBodiesEqual(existing.body, normalizedBody)) {
        return { ok: false, reason: "body_mismatch" };
      }
      return { ok: false, reason: "blocked" };
    }
  }

  const record: StoreOrderAttemptRecord = {
    version: STORE_ORDER_ATTEMPT_FORMAT_VERSION,
    userId: params.userId,
    idempotencyKey: generateStoreOrderIdempotencyKey(),
    body: normalizedBody,
    status: "in_flight",
  };

  if (!saveStoreOrderAttempt(record)) {
    return { ok: false, reason: "storage" };
  }

  return { ok: true, record };
}

/** Retry/check — returns immutable stored key+body; never accepts form overrides. */
export function prepareStoreOrderRetry(userId: string): PrepareRetryResult {
  const record = loadStoreOrderAttempt(userId);
  if (!record) {
    return { ok: false, reason: "none" };
  }
  if (record.userId !== userId) {
    return { ok: false, reason: "foreign_user" };
  }
  if (record.status === "conflict") {
    return { ok: false, reason: "conflict" };
  }
  if (record.status !== "unknown" && record.status !== "in_flight") {
    return { ok: false, reason: "none" };
  }
  return { ok: true, record };
}

export function markStoreOrderAttemptInFlight(userId: string): StoreOrderAttemptRecord | null {
  const record = readRawAttempt();
  if (!record || record.userId !== userId) {
    return null;
  }
  const next = { ...record, status: "in_flight" as const };
  saveStoreOrderAttempt(next);
  return next;
}

export function markStoreOrderAttemptUnknown(userId: string): StoreOrderAttemptRecord | null {
  const record = readRawAttempt();
  if (!record || record.userId !== userId) {
    return null;
  }
  const next = { ...record, status: "unknown" as const };
  saveStoreOrderAttempt(next);
  return next;
}

export function markStoreOrderAttemptConflict(userId: string): StoreOrderAttemptRecord | null {
  const record = readRawAttempt();
  if (!record || record.userId !== userId) {
    return null;
  }
  const next = { ...record, status: "conflict" as const };
  saveStoreOrderAttempt(next);
  return next;
}

export function markStoreOrderAttemptSucceeded(
  userId: string,
  orderId: string,
): StoreOrderAttemptRecord | null {
  const record = readRawAttempt();
  if (!record || record.userId !== userId) {
    return null;
  }
  const next = { ...record, status: "succeeded" as const, orderId };
  saveStoreOrderAttempt(next);
  return next;
}

/** After confirmed validation failure on first POST (no server record). */
export function releaseStoreOrderAttemptForEdit(): void {
  clearStoreOrderAttempt();
}

export function isRestorableAttempt(record: StoreOrderAttemptRecord | null): boolean {
  return record?.status === "unknown";
}

export function isConflictAttempt(record: StoreOrderAttemptRecord | null): boolean {
  return record?.status === "conflict";
}

export function isStoreOrderAttemptLocked(record: StoreOrderAttemptRecord | null): boolean {
  return (
    record?.status === "unknown" ||
    record?.status === "conflict" ||
    record?.status === "in_flight"
  );
}

export function formatAttemptItemsSummary(body: StoreOrderAttemptBody): string {
  return normalizeStoreOrderAttemptBody(body)
    .items.map(
      (item) => `${displayCategoryLabel(item.category, item.categoryLabel)}: ${item.amount} ₽`,
    )
    .join("; ");
}

export type OrderCreateResult = {
  order: { id: string };
  summary: {
    totalAmount: number;
    discountAmount: number;
    issuerBonusAmount?: number;
    proBonusAmount?: number;
    isSelfScan: boolean;
  };
};

export function validateOrderCreatePayload(payload: unknown): OrderCreateResult {
  if (!payload || typeof payload !== "object") {
    throw new Error("ORDER_RESPONSE_UNCERTAIN");
  }
  const record = payload as Record<string, unknown>;
  const order = record.order;
  const summary = record.summary;
  if (!order || typeof order !== "object") {
    throw new Error("ORDER_RESPONSE_UNCERTAIN");
  }
  const orderId = (order as Record<string, unknown>).id;
  if (typeof orderId !== "string" || !orderId.trim()) {
    throw new Error("ORDER_RESPONSE_UNCERTAIN");
  }
  if (!summary || typeof summary !== "object") {
    throw new Error("ORDER_RESPONSE_UNCERTAIN");
  }
  const summaryRecord = summary as Record<string, unknown>;
  if (
    typeof summaryRecord.totalAmount !== "number" ||
    !Number.isFinite(summaryRecord.totalAmount) ||
    typeof summaryRecord.discountAmount !== "number" ||
    !Number.isFinite(summaryRecord.discountAmount) ||
    typeof summaryRecord.isSelfScan !== "boolean"
  ) {
    throw new Error("ORDER_RESPONSE_UNCERTAIN");
  }
  return payload as OrderCreateResult;
}

export function isUncertainOrderSubmitError(error: unknown): boolean {
  if (error instanceof Error && error.message === "ORDER_RESPONSE_UNCERTAIN") {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  return false;
}

export const ATTEMPT_CONFLICT_MESSAGE =
  "Данные этой попытки отличаются от уже отправленных. Проверьте покупку перед созданием новой.";

export const ATTEMPT_BODY_MISMATCH_MESSAGE =
  "Суммы не совпадают с сохранённой попыткой. Используйте «Проверить результат» или «Новая покупка».";

export const UNCERTAIN_ORDER_HEADING = "Результат неизвестен";
export const UNCERTAIN_ORDER_DETAIL =
  "Покупка могла сохраниться. Нажмите «Проверить результат» — суммы и ключ не изменятся.";

export const NEW_PURCHASE_WARNING =
  "Если предыдущая операция уже сохранилась на сервере, новое подтверждение может создать ещё одну покупку. Продолжить?";

export const STORAGE_SAVE_FAILED_MESSAGE =
  "Не удалось сохранить попытку покупки. Проверьте настройки браузера и повторите.";

/** @deprecated use ATTEMPT_CONFLICT_MESSAGE */
export const IDEMPOTENCY_MISMATCH_MESSAGE = ATTEMPT_CONFLICT_MESSAGE;

function extractErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  return undefined;
}

export type OrderPostOutcome =
  | { kind: "success"; data: OrderCreateResult }
  | { kind: "conflict" }
  | { kind: "uncertain" }
  | { kind: "validation_failed"; message: string }
  | { kind: "auth_required"; message: string }
  | { kind: "unknown_persist"; message?: string };

export function classifyStoreOrderPostResponse(params: {
  status: number;
  payload: unknown;
  wasRetry: boolean;
}): OrderPostOutcome {
  if (params.status === 409) {
    return { kind: "conflict" };
  }

  if (params.status >= 200 && params.status < 300) {
    try {
      return { kind: "success", data: validateOrderCreatePayload(params.payload) };
    } catch {
      return { kind: "uncertain" };
    }
  }

  const message = extractErrorMessage(params.payload) ?? "Ошибка создания заказа";

  if (params.status === 401) {
    return { kind: "auth_required", message };
  }

  if (params.status === 0) {
    return params.wasRetry ? { kind: "unknown_persist", message } : { kind: "uncertain" };
  }

  if (params.wasRetry) {
    return { kind: "unknown_persist", message };
  }

  if (params.status >= 500) {
    return { kind: "uncertain" };
  }

  return { kind: "validation_failed", message };
}

export function classifyStoreOrderNetworkFailure(wasRetry: boolean): OrderPostOutcome {
  return wasRetry ? { kind: "unknown_persist" } : { kind: "uncertain" };
}
