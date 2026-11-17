import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "./api-client";

vi.mock("./api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api-client")>()),
  remcardFetch: vi.fn(),
}));
vi.mock("./settlements-loader", () => ({ fetchSettlements: vi.fn() }));

import { remcardFetch } from "./api-client";
import { fetchPurchaseByOrderId } from "./history-loader";

const base = {
  orderId: "cmwkth4df03iy2185ecgymfwq",
  createdAt: "2026-11-17T10:00:00.000Z",
  status: "CONFIRMED",
  totalAmount: 10000,
  discountAmount: 700,
  payableAmount: 9300,
  isSelfScan: false,
  promoCode: "RC-X",
  clientName: "Клиент",
  branchId: null,
  branchName: null,
  branchCity: null,
  proBonus: 300,
  items: [],
};
const storeDetail = { order: { ...base, proName: "Выпускающий", storeName: "Магазин", executorUserId: "u", executorName: null, linkedAccruals: [{ id: "b1", type: "bonus" }] } };
const proDetail = { order: { ...base, storeName: "Магазин", linkedAccruals: [{ id: "b1", type: "bonus" }] } };

function route(store: unknown, pro: unknown) {
  vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
    const r = path.startsWith("/api/store/orders/") ? store : pro;
    if (r instanceof RemcardApiError) throw r;
    return r as never;
  });
}

describe("AB-13 fetchPurchaseByOrderId from a wallet row", () => {
  beforeEach(() => vi.clearAllMocks());

  it("receiving side: the store detail answers 200 and opens the purchase (orderId contract)", async () => {
    route(storeDetail, new RemcardApiError(404, "no"));
    const row = await fetchPurchaseByOrderId(base.orderId);
    expect(row?.orderId).toBe(base.orderId);
    expect(remcardFetch).toHaveBeenCalledTimes(1);
  });

  it("issuing employee: store 404 then pro detail 200 opens the purchase", async () => {
    route(new RemcardApiError(404, "no"), proDetail);
    const row = await fetchPurchaseByOrderId(base.orderId);
    expect(row?.orderId).toBe(base.orderId);
    expect(remcardFetch).toHaveBeenCalledTimes(2);
  });

  it("foreign order: both endpoints closed keeps the honest not-found result", async () => {
    route(new RemcardApiError(403, "no"), new RemcardApiError(403, "no"));
    expect(await fetchPurchaseByOrderId("foreign")).toBeNull();
  });

  it("a server error is not swallowed as not-found", async () => {
    route(new RemcardApiError(500, "boom"), proDetail);
    await expect(fetchPurchaseByOrderId(base.orderId)).rejects.toMatchObject({ status: 500 });
  });
});
