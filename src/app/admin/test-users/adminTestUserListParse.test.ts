import { describe, expect, it } from "vitest";
import { parseAdminTestUserListResponse } from "./adminTestUserListParse";

const validRow = {
  id: "u1",
  publicId: "RC-TEST-1",
  displayName: "Тест",
  partnerType: "MASTER",
  partnerActivities: ["SERVICE"],
  profTestDisabledAt: null,
  profTestCreatedAt: "2026-11-01T00:00:00.000Z",
};

describe("parseAdminTestUserListResponse", () => {
  it("accepts genuine empty items array", () => {
    const parsed = parseAdminTestUserListResponse({ items: [] });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.items).toEqual([]);
  });

  it("rejects missing items key", () => {
    const parsed = parseAdminTestUserListResponse({});
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toMatch(/не содержит список/i);
  });

  it("rejects malformed row without treating as empty list", () => {
    const parsed = parseAdminTestUserListResponse({ items: [{ id: "x" }] });
    expect(parsed.ok).toBe(false);
  });

  it("accepts row with optional null partnerType and empty activities", () => {
    const parsed = parseAdminTestUserListResponse({
      items: [
        {
          ...validRow,
          partnerType: null,
          partnerActivities: [],
        },
      ],
    });
    expect(parsed.ok).toBe(true);
  });

  it("rejects duplicate ids fail-closed", () => {
    const parsed = parseAdminTestUserListResponse({
      items: [validRow, { ...validRow, publicId: "RC-TEST-2" }],
    });
    expect(parsed.ok).toBe(false);
  });
});
