import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSiteLinkMetadata,
  SITE_OG_DESCRIPTION,
  SITE_OG_TITLE,
  siteOpenGraphImageUrl,
} from "./site-opengraph.ts";
import { buildInviteLinkMetadata } from "./invite-presentation.ts";

describe("site opengraph", () => {
  it("builds home metadata with absolute image URL and twitter card", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://prof.remcard.ru";
    try {
      const meta = buildSiteLinkMetadata("/");
      assert.equal(meta.title, SITE_OG_TITLE);
      assert.equal(meta.description, SITE_OG_DESCRIPTION);
      assert.equal(String(meta.metadataBase), "https://prof.remcard.ru/");
      assert.equal(meta.openGraph?.locale, "ru_RU");
      assert.equal(meta.openGraph?.siteName, "RemCard PROF");
      assert.equal(meta.openGraph?.url, "https://prof.remcard.ru/");
      assert.equal(meta.twitter?.card, "summary_large_image");
      const img = meta.openGraph?.images?.[0];
      assert.equal(img?.url, "https://prof.remcard.ru/opengraph-image");
      assert.equal(img?.width, 1200);
      assert.equal(img?.height, 630);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });

  it("builds login metadata with login page url", () => {
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://prof.remcard.ru";
    try {
      const meta = buildSiteLinkMetadata("/login");
      assert.equal(meta.openGraph?.url, "https://prof.remcard.ru/login");
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
      else process.env.NEXT_PUBLIC_APP_URL = prev;
    }
  });

  it("site image url differs from invite personal preview image", () => {
    const origin = "https://prof.remcard.ru";
    assert.notEqual(siteOpenGraphImageUrl(origin), `${origin}/invite/opengraph-image`);
  });

  it("invite metadata still uses invite image and personal title", () => {
    const meta = buildInviteLinkMetadata({
      preview: {
        status: "PENDING",
        inviter: { displayName: "Иван", partnerType: "MASTER", city: null },
        intendedPartnerType: null,
        terms: [],
      },
      pageUrl: "https://prof.remcard.ru/invite/abc",
      ogImageUrl: "https://prof.remcard.ru/invite/opengraph-image",
    });
    assert.match(String(meta.title), /Иван приглашает/);
    assert.equal(meta.openGraph?.images?.[0]?.url, "https://prof.remcard.ru/invite/opengraph-image");
    assert.doesNotMatch(String(meta.title), /Клиенты по рекомендациям/);
  });
});
