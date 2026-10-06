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

export type StoreOrderAttemptStatus = "in_flight" | "unknown" | "succeeded";

export type StoreOrderAttemptRecord = {
  version: typeof STORE_ORDER_ATTEMPT_FORMAT_VERSION;
  userId: string;
  idempotencyKey: string;
  body: StoreOrderAttemptBody;
  status: StoreOrderAttemptStatus;
  orderId?: string;
};

export type PersistAttemptResult =
  | { ok: true; record: StoreOrderAttemptRecord }
  | { ok: false; reason: "storage" | "foreign_user" };

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
      .filter((item) => item.category && Number.isFinite(item.amount) && item.amount > 0),
  };
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

export function beginStoreOrderAttempt(params: {
  userId: string;
  body: StoreOrderAttemptBody;
  existing?: StoreOrderAttemptRecord | null;
}): PersistAttemptResult {
  const normalizedBody = normalizeStoreOrderAttemptBody(params.body);
  if (!normalizedBody.certificateCode || normalizedBody.items.length === 0) {
    return { ok: false, reason: "storage" };
  }

  const existing = params.existing ?? loadStoreOrderAttempt(params.userId);
  if (existing && existing.userId !== params.userId) {
    return { ok: false, reason: "foreign_user" };
  }

  const record: StoreOrderAttemptRecord = existing
    ? {
        ...existing,
        body: normalizedBody,
        status: "in_flight",
      }
    : {
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

export function markStoreOrderAttemptUnknown(userId: string): StoreOrderAttemptRecord | null {
  const record = loadStoreOrderAttempt(userId);
  if (!record) {
    return null;
  }
  const next = { ...record, status: "unknown" as const };
  saveStoreOrderAttempt(next);
  return next;
}

export function markStoreOrderAttemptSucceeded(
  userId: string,
  orderId: string,
): StoreOrderAttemptRecord | null {
  const record = loadStoreOrderAttempt(userId);
  if (!record) {
    return null;
  }
  const next = { ...record, status: "succeeded" as const, orderId };
  saveStoreOrderAttempt(next);
  return next;
}

export function isStoreOrderAttemptLocked(record: StoreOrderAttemptRecord | null): boolean {
  return record?.status === "unknown" || record?.status === "in_flight";
}
