import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatLinkInviteCopyText,
  linkInviteListTitle,
  LINK_INVITE_MISSING_RECIPIENT,
} from "./link-invite-labels";
import type { LinkInviteListRow } from "./link-invite-list";

function row(overrides: Partial<LinkInviteListRow> = {}): LinkInviteListRow {
  return {
    id: "inv-1",
    status: "PENDING",
    statusLabel: "Активно",
    expiresAt: "2099-01-01T00:00:00.000Z",
    legacyTtl: false,
    createdAt: "2026-11-19T10:00:00.000Z",
    acceptedAt: null,
    intendedPartnerType: "STORE",
    note: null,
    partnershipId: null,
    previewPath: "/invite/x",
    canCopyLink: true,
    canReissue: false,
    createdBy: { userId: "u1", displayName: "Автор", at: "2026-11-19T10:00:00.000Z" },
    acceptedBy: null,
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
    ...overrides,
  };
}

describe("link-invite labels", () => {
  it("uses personal label over recipient on list title", () => {
    assert.equal(
      linkInviteListTitle(row({ personalLabel: "Мой специалист", recipientLabel: "Илья Лебедев" })),
      "Мой специалист",
    );
  });

  it("copy text never includes personal list title", () => {
    const text = formatLinkInviteCopyText({
      invite: row({
        personalLabel: "Скрытое имя",
        recipientLabel: "Илья",
        note: "Публичный комментарий",
      }),
      url: "https://prof.example/invite/x",
      inviterName: "Автор",
      inviterType: "STORE",
    });
    assert.equal(text, "Публичный комментарий\n\nhttps://prof.example/invite/x");
    assert.doesNotMatch(text, /Скрытое имя/);
  });

  it("shows honest gap when recipient is missing", () => {
    assert.equal(
      linkInviteListTitle(row({ recipientLabel: null, personalLabel: null })),
      LINK_INVITE_MISSING_RECIPIENT,
    );
  });
});