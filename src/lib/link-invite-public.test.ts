import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { fetchRemcardUpstream } from "./remcard-server.ts";
import {
  fetchPublicLinkInvitePreview,
  isValidLinkInviteParticipatingTerm,
  linkInvitePreviewHasAcceptableTerms,
  LINK_INVITE_PUBLIC_PREVIEW_TIMEOUT_MS,
  linkInvitePublicPreviewDeps,
} from "./link-invite-public.ts";
import { buildInviteLinkMetadata } from "./invite-presentation.ts";

const validRow = {
  category: "plumbing",
  categoryLabel: "Сантехника",
  storePercent: 10,
  isExcluded: false,
};

describe("linkInvitePreviewHasAcceptableTerms", () => {
  it("requires every participating row to be valid", () => {
    assert.equal(linkInvitePreviewHasAcceptableTerms({ terms: undefined }), false);
    assert.equal(linkInvitePreviewHasAcceptableTerms({ terms: [] }), false);
    assert.equal(linkInvitePreviewHasAcceptableTerms({ terms: [null] }), false);
    assert.equal(linkInvitePreviewHasAcceptableTerms({ terms: [{}] }), false);
    assert.equal(
      linkInvitePreviewHasAcceptableTerms({
        terms: [{ category: "a", categoryLabel: "A", isExcluded: false }],
      }),
      false,
    );
    assert.equal(
      linkInvitePreviewHasAcceptableTerms({
        terms: [{ category: "a", categoryLabel: "A", storePercent: NaN, isExcluded: false }],
      }),
      false,
    );
    assert.equal(
      linkInvitePreviewHasAcceptableTerms({
        terms: [{ category: "a", categoryLabel: "A", storePercent: "10", isExcluded: false }],
      }),
      false,
    );
    assert.equal(
      linkInvitePreviewHasAcceptableTerms({
        terms: [validRow, { category: "bad", isExcluded: false }],
      }),
      false,
    );
    assert.equal(linkInvitePreviewHasAcceptableTerms({ terms: [validRow] }), true);
    assert.equal(
      linkInvitePreviewHasAcceptableTerms({
        terms: [{ ...validRow, storePercent: 0 }],
      }),
      true,
    );
    assert.equal(
      linkInvitePreviewHasAcceptableTerms({
        terms: [{ category: "x", categoryLabel: "X", storePercent: 10, isExcluded: true }],
      }),
      false,
    );
    assert.equal(
      linkInvitePreviewHasAcceptableTerms({
        terms: [
          validRow,
          { category: "tiles", categoryLabel: "Плитка", storePercent: 5, isExcluded: true },
        ],
      }),
      true,
    );
  });

  it("isValidLinkInviteParticipatingTerm accepts finite 0%", () => {
    assert.equal(isValidLinkInviteParticipatingTerm(validRow), true);
    assert.equal(
      isValidLinkInviteParticipatingTerm({ ...validRow, storePercent: 0 }),
      true,
    );
    assert.equal(isValidLinkInviteParticipatingTerm(null), false);
  });
});

describe("fetchPublicLinkInvitePreview", () => {
  afterEach(() => {
    linkInvitePublicPreviewDeps.fetchUpstream = fetchRemcardUpstream;
  });

  it("returns NOT_FOUND shape for empty token without calling upstream", async () => {
    let called = false;
    linkInvitePublicPreviewDeps.fetchUpstream = async () => {
      called = true;
      return { ok: true, data: { status: "PENDING" } };
    };
    const result = await fetchPublicLinkInvitePreview("   ");
    assert.deepEqual(result, { status: "NOT_FOUND" });
    assert.equal(called, false);
  });

  it("returns null when upstream fetch rejects (network)", async () => {
    linkInvitePublicPreviewDeps.fetchUpstream = async () => {
      throw new TypeError("fetch failed");
    };
    assert.equal(await fetchPublicLinkInvitePreview("abc"), null);
  });

  it("returns null on abort/timeout and passes bounded signal", async () => {
    linkInvitePublicPreviewDeps.fetchUpstream = async (_path, init) => {
      assert.ok(init?.signal instanceof AbortSignal);
      const error = new Error("The operation was aborted");
      error.name = "AbortError";
      throw error;
    };
    assert.equal(await fetchPublicLinkInvitePreview("abc"), null);
    assert.equal(LINK_INVITE_PUBLIC_PREVIEW_TIMEOUT_MS, 5_000);
  });

  it("returns null when upstream throws on invalid JSON parse", async () => {
    linkInvitePublicPreviewDeps.fetchUpstream = async () => {
      throw new SyntaxError("Unexpected token");
    };
    assert.equal(await fetchPublicLinkInvitePreview("abc"), null);
  });

  it("returns null when upstream responds with error envelope", async () => {
    linkInvitePublicPreviewDeps.fetchUpstream = async () => ({
      ok: false,
      status: 503,
      message: "unavailable",
      configured: true,
    });
    assert.equal(await fetchPublicLinkInvitePreview("abc"), null);
  });

  it("maps null preview to neutral metadata for generateMetadata", () => {
    const meta = buildInviteLinkMetadata({
      preview: null,
      pageUrl: "https://prof.example/invite/tok",
      ogImageUrl: "https://prof.example/invite/opengraph-image",
    });
    assert.match(String(meta.title), /Приглашение RemCard PROF/);
    assert.match(String(meta.description), /Не удалось загрузить/);
    assert.doesNotMatch(String(meta.title), /приглашает вас/i);
  });
});

describe("fetchPublicLinkInvitePreview integration", () => {
  it("returns null for unreachable upstream without throwing", async () => {
    const previous = process.env.REMCARD_API_BASE_URL;
    process.env.REMCARD_API_BASE_URL = "http://127.0.0.1:9";
    try {
      const result = await fetchPublicLinkInvitePreview("integration-token");
      assert.equal(result, null);
    } finally {
      if (previous === undefined) {
        delete process.env.REMCARD_API_BASE_URL;
      } else {
        process.env.REMCARD_API_BASE_URL = previous;
      }
    }
  });
});
