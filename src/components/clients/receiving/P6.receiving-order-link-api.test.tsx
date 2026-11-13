import { describe, expect, it, vi, beforeEach } from "vitest";
import { postReceivingAppealOrderLink } from "@/lib/clients-parity/receiving-appeals-api";
import * as proxy from "@/lib/remcard-proxy";
import * as client from "@/lib/api-client";

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: vi.fn(() => true),
}));

describe("P6.receiving-order-link-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(proxy, "isAllowedProxyRoute").mockReturnValue(true);
  });

  it("posts raw JSON body once via remcardFetch", async () => {
    const fetch = vi.spyOn(client, "remcardFetch").mockResolvedValue({
      appealId: "ap_1",
      orderId: "ord_9",
      revision: 5,
      alreadyLinked: false,
    });
    const res = await postReceivingAppealOrderLink("ap_1", {
      orderId: "ord_9",
      expectedRevision: 4,
    });
    expect(res.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/pro/client-appeals/ap_1/order-link", {
      method: "POST",
      body: { orderId: "ord_9", expectedRevision: 4 },
    });
  });
});
