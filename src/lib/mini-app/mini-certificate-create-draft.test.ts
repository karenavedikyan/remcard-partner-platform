import { describe, expect, it, beforeEach } from "vitest";
import {
  clearMiniCertificateCreateDraft,
  loadMiniCertificateCreateDraft,
  saveMiniCertificateCreateDraft,
} from "@/lib/mini-app/mini-certificate-create-draft";

const scope = { actorUserId: "u1", platform: "telegram" as const, branchId: "br-1" };

describe("mini-certificate-create-draft", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("saves and restores wizard state per branch", () => {
    saveMiniCertificateCreateDraft(scope, {
      wizardStep: 2,
      selectedKeys: ["store-1:part-1"],
      discountDrafts: { "store-1::doors": "4" },
      selectedCategoryKeys: { "store-1::doors": true },
      partnerSearchQuery: "Alpha",
      clientId: "c-1",
    });
    const loaded = loadMiniCertificateCreateDraft(scope);
    expect(loaded?.wizardStep).toBe(2);
    expect(loaded?.discountDrafts["store-1::doors"]).toBe("4");
    clearMiniCertificateCreateDraft(scope);
    expect(loadMiniCertificateCreateDraft(scope)).toBeNull();
  });

  it("does not restore draft for another branch", () => {
    saveMiniCertificateCreateDraft(scope, {
      wizardStep: 1,
      selectedKeys: [],
      discountDrafts: {},
      selectedCategoryKeys: {},
      partnerSearchQuery: "",
      clientId: "",
    });
    const other = loadMiniCertificateCreateDraft({ ...scope, branchId: "br-2" });
    expect(other).toBeNull();
  });
});