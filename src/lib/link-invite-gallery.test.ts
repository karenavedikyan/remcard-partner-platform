import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatLinkInviteCopyText,
  linkInviteCardTitle,
  matchesLinkInviteSearch,
  inviteRowAllowsPublicCopy,
  manualCopySnapshotStillValid,
  mergeLinkInvitePhaseItems,
} from "./link-invite-gallery";
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
    createdBy: { userId: "u1", displayName: "Анна Волкова", at: "2026-11-19T10:00:00.000Z" },
    acceptedBy: null,
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
    ...overrides,
  };
}

describe("link-invite gallery helpers", () => {
  it("uses personal label over recipient on card title", () => {
    assert.equal(
      linkInviteCardTitle(row({ personalLabel: "Мой специалист", recipientLabel: "Илья Лебедев" })),
      "Мой специалист",
    );
  });

  it("copy text puts blank line before url", () => {
    const text = formatLinkInviteCopyText({
      invite: row({ note: "Короткий текст" }),
      url: "https://prof.example/invite/x",
      inviterName: "Автор",
      inviterType: "STORE",
    });
    assert.equal(text, "Короткий текст\n\nhttps://prof.example/invite/x");
  });

  it("search matches author and type", () => {
    assert.equal(matchesLinkInviteSearch(row(), "волкова"), true);
    assert.equal(matchesLinkInviteSearch(row(), "магазин"), true);
    assert.equal(matchesLinkInviteSearch(row(), "zzz"), false);
  });

  it("search matches archive acceptor name", () => {
    assert.equal(
      matchesLinkInviteSearch(
        row({
          status: "ACCEPTED",
          acceptedBy: { userId: "u2", displayName: "Партнёр на странице 2", at: "2026-11-18T12:00:00.000Z" },
        }),
        "странице 2",
      ),
      true,
    );
  });

  it("shows honest gap when recipient is missing", () => {
    assert.equal(linkInviteCardTitle(row({ recipientLabel: null, personalLabel: null })), "Имя не сохранено");
  });

  it("rejects manual snapshot when preview path changes", () => {
    const ctx = { listMode: "v2" as const, resurfaceEnabled: true };
    const invite = row({ previewPath: "/invite/new" });
    const snap = { url: "https://prof.example/invite/old", previewPath: "/invite/old" };
    assert.equal(
      manualCopySnapshotStillValid(invite, snap, "https://prof.example/invite/new", ctx),
      false,
    );
  });

  it("archive accepted row cannot show public copy", () => {
    assert.equal(
      inviteRowAllowsPublicCopy(
        row({ status: "ACCEPTED", canCopyLink: false, previewPath: null }),
        { listMode: "v2", resurfaceEnabled: true },
      ),
      false,
    );
  });

  it("dedupes merged phase pages by invite id", () => {
    const base = [row({ id: "a" })];
    const merged = mergeLinkInvitePhaseItems(base, [row({ id: "a" }), row({ id: "b" })]);
    assert.equal(merged.length, 2);
    assert.equal(merged[1]?.id, "b");
  });
});