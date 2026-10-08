import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInviteHeroContent,
  buildInviteLinkMetadata,
  buildInviteShareMessage,
  formatInviteAudienceLabel,
  inviteOgDescription,
  inviterDisplayName,
  resolveInviteAudience,
} from "./invite-presentation.ts";
import type { LinkInvitePublicPreview } from "./link-invite-public.ts";

function pendingPreview(
  overrides: Partial<LinkInvitePublicPreview> = {},
): LinkInvitePublicPreview {
  return {
    status: "PENDING",
    inviter: {
      displayName: "ОПТОВИК",
      partnerType: "STORE",
      city: "Краснодар",
    },
    intendedPartnerType: null,
    terms: [{ category: "doors", categoryLabel: "doors", storePercent: 10, isExcluded: false }],
    ...overrides,
  };
}

describe("invite presentation", () => {
  it("resolves store inviter audience as master-facing copy", () => {
    assert.equal(resolveInviteAudience("STORE", null), "master");
    const hero = buildInviteHeroContent(pendingPreview());
    assert.match(hero.headline, /ОПТОВИК/);
    assert.match(hero.lead, /вознаграждение/);
    assert.equal(hero.bullets.length, 3);
    assert.equal(formatInviteAudienceLabel(null, "STORE"), "Для специалистов");
  });

  it("uses store-invitee copy when master invites a store", () => {
    const hero = buildInviteHeroContent(
      pendingPreview({
        inviter: { displayName: "Иван", partnerType: "MASTER", city: null },
        intendedPartnerType: "STORE",
      }),
    );
    assert.match(hero.lead, /рекомендациям специалистов/);
    assert.equal(formatInviteAudienceLabel("STORE", "MASTER"), "Для магазинов");
    assert.match(inviteOgDescription("MASTER", "STORE"), /Продажи по рекомендациям/);
  });

  it("builds active metadata with inviter in title", () => {
    const meta = buildInviteLinkMetadata({
      preview: pendingPreview(),
      pageUrl: "https://prof.example/invite/abc",
      ogImageUrl: "https://prof.example/invite/opengraph-image",
    });
    assert.match(String(meta.title), /ОПТОВИК приглашает/);
    assert.equal(meta.openGraph?.type, "website");
    assert.equal(meta.openGraph?.locale, "ru_RU");
    assert.equal(meta.twitter?.card, "summary_large_image");
    assert.equal(meta.openGraph?.images?.[0]?.url, "https://prof.example/invite/opengraph-image");
    assert.equal(typeof meta.robots === "object" && meta.robots !== null && "index" in meta.robots && meta.robots.index, false);
    assert.equal(meta.referrer, "no-referrer");
  });

  it("uses neutral metadata for expired invites", () => {
    const meta = buildInviteLinkMetadata({
      preview: { status: "EXPIRED" },
      pageUrl: "https://prof.example/invite/x",
      ogImageUrl: "https://prof.example/invite/opengraph-image",
    });
    assert.match(String(meta.title), /Срок приглашения истёк/);
    assert.doesNotMatch(String(meta.description), /вознагражден/i);
  });

  it("builds share message with inviter name and optional benefit line", () => {
    const url = "https://prof.example/invite/tok";
    const storeMsg = buildInviteShareMessage({
      inviterName: "ОПТОВИК",
      url,
      inviterType: "STORE",
    });
    assert.match(storeMsg, /ОПТОВИК/);
    assert.ok(storeMsg.includes(url));
    assert.match(storeMsg, /скидку по вашей рекомендации/);
  });

  it("falls back inviter display name", () => {
    assert.equal(inviterDisplayName({ status: "PENDING" }), "Партнёр RemCard");
  });
});
