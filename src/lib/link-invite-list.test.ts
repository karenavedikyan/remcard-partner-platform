import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { emptyLinkInviteList, parseLinkInviteListPayload } from "./link-invite-list";

describe("parseLinkInviteListPayload", () => {
  it("parses v2 listVersion=2", () => {
    const parsed = parseLinkInviteListPayload({ ...emptyLinkInviteList(), resurfaceEnabled: true });
    assert.equal(parsed.mode, "v2");
    assert.equal(parsed.list.resurfaceEnabled, true);
  });

  it("preserves recipient and personal label fields from v2 items", () => {
    const parsed = parseLinkInviteListPayload({
      ...emptyLinkInviteList(),
      active: {
        items: [
          {
            id: "x",
            status: "PENDING",
            statusLabel: "Активно",
            expiresAt: "2099-01-01T00:00:00.000Z",
            legacyTtl: false,
            createdAt: "2026-11-19T10:00:00.000Z",
            acceptedAt: null,
            recipientLabel: "Публичный",
            personalLabel: "Частный",
            canEditPersonalLabel: true,
            intendedPartnerType: "MASTER",
            note: null,
            partnershipId: null,
            previewPath: "/invite/x",
            canCopyLink: true,
            canReissue: false,
            createdBy: { userId: "u", displayName: "А", at: "2026-11-19T10:00:00.000Z" },
            acceptedBy: null,
            terms: [],
          },
        ],
        nextCursor: null,
      },
    });
    const row = parsed.list.active.items[0];
    assert.equal(row?.recipientLabel, "Публичный");
    assert.equal(row?.personalLabel, "Частный");
    assert.equal(row?.canEditPersonalLabel, true);
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