import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyLinkInviteList, parseLinkInviteListPayload } from "./link-invite-list";

describe("parseLinkInviteListPayload", () => {
  it("parses v2 listVersion=2", () => {
    const parsed = parseLinkInviteListPayload({ ...emptyLinkInviteList(), resurfaceEnabled: true });
    assert.equal(parsed.mode, "v2");
    assert.equal(parsed.list.resurfaceEnabled, true);
  });

  it("parses legacy invites[] without sensitive fields", () => {
    const parsed = parseLinkInviteListPayload({
      invites: [
        {
          id: "a",
          status: "PENDING",
          expiresAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          acceptedAt: null,
          intendedPartnerType: "MASTER",
          note: null,
          partnershipId: null,
          terms: [],
        },
      ],
    });
    assert.equal(parsed.mode, "legacy");
    assert.equal(parsed.list.active.items[0]?.canCopyLink, false);
    assert.equal(parsed.list.active.items[0]?.previewPath, null);
  });
});