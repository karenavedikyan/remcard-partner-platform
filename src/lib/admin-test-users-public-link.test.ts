import { describe, expect, it } from "vitest";
import { adminTestUserPublicCatalogUrl } from "./admin-test-users-public-link";

const base = {
  id: "user-internal-id",
  publicId: "RC-TEST-ABCD",
  profTestPublicCatalogAllowed: true,
  catalogStatus: "APPROVED" as const,
  isPublic: true,
};

describe("adminTestUserPublicCatalogUrl", () => {
  it("links solo approved test user by internal user id", () => {
    expect(adminTestUserPublicCatalogUrl(base)).toBe(
      "https://remcard.ru/partner/user-internal-id",
    );
  });

  it("links published approved org", () => {
    expect(
      adminTestUserPublicCatalogUrl({
        ...base,
        organizationsOwned: [
          { id: "org-1", catalogStatus: "APPROVED", catalogPublished: true },
        ],
      }),
    ).toBe("https://remcard.ru/catalog/org/org-1");
  });

  it("returns null when public show disallowed", () => {
    expect(adminTestUserPublicCatalogUrl({ ...base, profTestPublicCatalogAllowed: false })).toBeNull();
  });

  it("returns null for unapproved solo even if isPublic", () => {
    expect(
      adminTestUserPublicCatalogUrl({ ...base, catalogStatus: "PENDING", isPublic: false }),
    ).toBeNull();
  });

  it("returns null when admin blocked", () => {
    expect(adminTestUserPublicCatalogUrl({ ...base, isBlocked: true })).toBeNull();
  });
});
