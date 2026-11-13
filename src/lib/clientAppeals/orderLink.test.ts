import { describe, expect, it } from "vitest";
import { linkReceivingAppealOrder } from "./orderLink";
import { createInMemoryOrderLinkRepository } from "./orderLink.inMemoryRepository";

const gate = {
  actorUserId: "u1",
  receivingPartnerUserId: "u1",
  receivingOrganizationId: null,
  receivingBranchId: null,
};

describe("linkReceivingAppealOrder", () => {
  it("links order on success", async () => {
    const { repo } = createInMemoryOrderLinkRepository({
      appeals: {
        a1: {
          appealId: "a1",
          revision: 2,
          orderId: null,
          certificateId: "cert-1",
          lifecycle: "open",
          receivingPartnerUserId: "u1",
          receivingOrganizationId: null,
          receivingBranchId: null,
        },
      },
      orders: {
        o1: {
          orderId: "o1",
          certificateId: "cert-1",
          receivingPartnerUserId: "u1",
          receivingOrganizationId: null,
          receivingBranchId: null,
        },
      },
    });

    const res = await linkReceivingAppealOrder(
      {
        appealId: "a1",
        orderId: "o1",
        expectedRevision: 2,
        ...gate,
      },
      repo,
    );
    expect(res.alreadyLinked).toBe(false);
    expect(res.revision).toBe(3);
  });

  it("idempotent same order", async () => {
    const { repo } = createInMemoryOrderLinkRepository({
      appeals: {
        a1: {
          appealId: "a1",
          revision: 4,
          orderId: "o1",
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

    const res = await linkReceivingAppealOrder(
      { appealId: "a1", orderId: "o1", expectedRevision: 4, ...gate },
      repo,
    );
    expect(res.alreadyLinked).toBe(true);
    expect(res.revision).toBe(4);
  });

  it("rejects steal reassignment", async () => {
    const { repo } = createInMemoryOrderLinkRepository({
      appeals: {
        a1: {
          appealId: "a1",
          revision: 1,
          orderId: "o-existing",
          certificateId: null,
          lifecycle: "open",
          receivingPartnerUserId: "u1",
          receivingOrganizationId: null,
          receivingBranchId: null,
        },
      },
      orders: {
        o2: {
          orderId: "o2",
          certificateId: null,
          receivingPartnerUserId: "u1",
          receivingOrganizationId: null,
          receivingBranchId: null,
        },
      },
    });

    await expect(
      linkReceivingAppealOrder(
        { appealId: "a1", orderId: "o2", expectedRevision: 1, ...gate },
        repo,
      ),
    ).rejects.toMatchObject({ status: 409, code: "ORDER_ALREADY_LINKED" });
  });

  it("409 on revision mismatch", async () => {
    const { repo } = createInMemoryOrderLinkRepository({
      appeals: {
        a1: {
          appealId: "a1",
          revision: 5,
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

    await expect(
      linkReceivingAppealOrder(
        { appealId: "a1", orderId: "o1", expectedRevision: 4, ...gate },
        repo,
      ),
    ).rejects.toMatchObject({ status: 409, code: "REVISION_CONFLICT" });
  });
});
