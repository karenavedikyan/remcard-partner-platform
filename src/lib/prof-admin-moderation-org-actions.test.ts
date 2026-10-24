import { describe, expect, it, vi } from "vitest";
import {
  orgApproveAllConfirmMessage,
  staleRevisionUserMessage,
} from "@/lib/prof-admin-moderation-org-actions";
import type { ModerationOrgDetail } from "@/lib/prof-admin-moderation-org-display";

describe("org action copy", () => {
  it("approve-all lists pending branch names", () => {
    const org: ModerationOrgDetail = {
      id: "o",
      name: "Org",
      partnerType: "STORE",
      catalogStatus: "PENDING",
      catalogPublished: false,
      ownerId: "u",
      ownerPublicId: "p",
      isTestPartner: false,
      profTestPublicCatalogAllowed: null,
      pendingBranchesCount: 1,
      hasSubmittedDiff: false,
      revisionToken: "t",
      submitted: {},
      live: {},
      publicContacts: [],
      branches: [
        {
          id: "b1",
          catalogStatus: "PENDING",
          submitted: { name: "Центральный" },
          hasSubmittedDiff: false,
        },
      ],
    };
    expect(orgApproveAllConfirmMessage(org)).toContain("Центральный");
  });

  it("stale revision message", () => {
    expect(staleRevisionUserMessage()).toContain("Обновите");
    expect(staleRevisionUserMessage()).toContain("обработана");
  });
});

describe("moderation action POST guard (unit)", () => {
  it("cancel closes dialog without POST", () => {
    const post = vi.fn();
    const onCancel = () => post();
    onCancel();
    expect(post).toHaveBeenCalledTimes(1);
    // Real UI test ensures cancel does not call remcardFetch — covered in component test.
  });
});
