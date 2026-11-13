import { describe, expect, it } from "vitest";
import { handleReceivingAppealOrderLinkPost } from "./orderLinkHttp";
import { createInMemoryOrderLinkRepository } from "./orderLink.inMemoryRepository";

const gate = {
  actorUserId: "u1",
  receivingPartnerUserId: "u1",
  receivingOrganizationId: null,
  receivingBranchId: null,
};

describe("handleReceivingAppealOrderLinkPost", () => {
  it("returns 200 on valid link", async () => {
    const { repo } = createInMemoryOrderLinkRepository({
      appeals: {
        a1: {
          appealId: "a1",
          revision: 1,
          orderId: null,
          certificateId: null,
          lifecycle: "open",
          receivingPartnerUserId: "u1",
          receivingOrganizationId: null,
          receivingBranchId: null,
        },
      },
      orders: {
        o1: {
          orderId: "o1",
          certificateId: null,
          receivingPartnerUserId: "u1",
          receivingOrganizationId: null,
          receivingBranchId: null,
        },
      },
    });

    const res = await handleReceivingAppealOrderLinkPost(
      "a1",
      { orderId: "o1", expectedRevision: 1 },
      gate,
      repo,
    );
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.body.orderId).toBe("o1");
  });

  it("returns 400 on bad body", async () => {
    const { repo } = createInMemoryOrderLinkRepository({ appeals: {}, orders: {} });
    const res = await handleReceivingAppealOrderLinkPost("a1", {}, gate, repo);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
  });
});
