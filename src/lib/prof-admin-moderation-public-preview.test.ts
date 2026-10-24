import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildModerationOrgPreviewRevisionQuery,
  fetchModerationOrganizationPublicPreview,
  moderationOrgPreviewRevisionFetchKey,
} from "@/lib/prof-admin-moderation-api";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
  };
});

import { remcardFetch } from "@/lib/api-client";

describe("moderationOrgPreviewRevisionFetchKey", () => {
  it("is stable for the same revision data across new object identities", () => {
    const branches = [{ id: "p1", catalogStatus: "PENDING", revisionToken: "b1" }];
    const a = moderationOrgPreviewRevisionFetchKey({
      id: "org",
      revisionToken: "rev",
      branches,
    });
    const b = moderationOrgPreviewRevisionFetchKey({
      id: "org",
      revisionToken: "rev",
      branches: [...branches],
    });
    expect(a).toBe(b);
  });
});

describe("buildModerationOrgPreviewRevisionQuery", () => {
  it("includes only pending branch revision tokens", () => {
    const q = buildModerationOrgPreviewRevisionQuery({
      revisionToken: "org-rev",
      branches: [
        { id: "p1", catalogStatus: "PENDING", revisionToken: "b1" },
        { id: "d1", catalogStatus: "DRAFT", revisionToken: "b2" },
      ],
    });
    expect(q.orgRevision).toBe("org-rev");
    expect(q.branchRevisions).toEqual({ p1: "b1" });
  });
});

describe("fetchModerationOrganizationPublicPreview", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("passes revision query and abort signal", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({ ok: true });
    const ac = new AbortController();
    await fetchModerationOrganizationPublicPreview("org1", {
      orgRevision: "t1",
      branchRevisions: { b1: "t2" },
      signal: ac.signal,
    });
    expect(remcardFetch).toHaveBeenCalledWith(
      expect.stringContaining("orgRevision=t1"),
      expect.objectContaining({ signal: ac.signal }),
    );
    expect(remcardFetch).toHaveBeenCalledWith(
      expect.stringContaining("branchRevisions="),
      expect.anything(),
    );
  });

  it("surfaces 409 from remcardFetch", async () => {
    vi.mocked(remcardFetch).mockRejectedValue(new RemcardApiError(409, "conflict"));
    await expect(
      fetchModerationOrganizationPublicPreview("org1", {
        orgRevision: "t1",
        branchRevisions: {},
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
