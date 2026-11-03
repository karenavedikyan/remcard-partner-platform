import type { StoreOrdersResponse } from "@/lib/history-types";
import type { PartnershipListResponse } from "@/lib/types";

export type SupplementalProbeState = "idle" | "loading" | "ok" | "error";

export type StoreLifetimeActivityProbe = {
  state: SupplementalProbeState;
  /** Successful read of GET /api/store/orders?limit=1 */
  ordersOk: boolean;
  hasLifetimeOrders: boolean | null;
  partnershipsOk: boolean;
  partnershipCount: number | null;
};

export type CompanyLifetimeActivityProbe = {
  state: SupplementalProbeState;
  partnershipsOk: boolean;
  partnershipCount: number | null;
};

export function parseStoreOrdersLifetimeProbe(body: unknown): {
  ok: boolean;
  hasOrders: boolean | null;
} {
  if (!body || typeof body !== "object") return { ok: false, hasOrders: null };
  const orders = (body as StoreOrdersResponse).orders;
  if (!Array.isArray(orders)) return { ok: false, hasOrders: null };
  return { ok: true, hasOrders: orders.length > 0 };
}

export function parsePartnershipCollectionProbe(body: unknown): {
  ok: boolean;
  count: number | null;
} {
  if (!body || typeof body !== "object") return { ok: false, count: null };
  const partnerships = (body as PartnershipListResponse).partnerships;
  if (!Array.isArray(partnerships)) return { ok: false, count: null };
  return { ok: true, count: partnerships.length };
}

export function initialStoreLifetimeProbe(): StoreLifetimeActivityProbe {
  return {
    state: "idle",
    ordersOk: false,
    hasLifetimeOrders: null,
    partnershipsOk: false,
    partnershipCount: null,
  };
}

export function initialCompanyLifetimeProbe(): CompanyLifetimeActivityProbe {
  return {
    state: "idle",
    partnershipsOk: false,
    partnershipCount: null,
  };
}
