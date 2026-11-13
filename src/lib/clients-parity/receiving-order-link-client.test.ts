import { describe, expect, it, vi, beforeEach } from "vitest";
import { postReceivingAppealOrderLink } from "./receiving-order-link-client";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class extends Error {
    status: number;
    body: { code?: string; error?: string } | null;
    constructor(status: number, message: string, body: { code?: string; error?: string } | null) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

import { remcardFetch } from "@/lib/api-client";

describe("postReceivingAppealOrderLink", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("posts order-link without double JSON stringify", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      appealId: "a1",
      orderId: "o1",
      revision: 2,
      alreadyLinked: false,
    });

    const res = await postReceivingAppealOrderLink("a1", {
      orderId: "o1",
      expectedRevision: 1,
    });
    expect(res.ok).toBe(true);
    expect(remcardFetch).toHaveBeenCalledWith(
      "/api/pro/client-appeals/a1/order-link",
      expect.objectContaining({
        method: "POST",
        body: { orderId: "o1", expectedRevision: 1 },
      }),
    );
  });
});
