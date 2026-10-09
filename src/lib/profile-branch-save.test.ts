import { describe, expect, it, vi, beforeEach } from "vitest";
import { persistBranchDraft } from "@/lib/profile-branch-save";
import { emptyBranchContactsForm } from "@/lib/branch-public-contacts";

const fetchMock = vi.fn(async () => ({
  ok: true,
  status: 200,
  headers: new Headers({ "content-type": "application/json" }),
  text: async () => JSON.stringify({ ok: true }),
  json: async () => ({ ok: true }),
}));

vi.stubGlobal("fetch", fetchMock);

describe("persistBranchDraft geohash payload", () => {
  beforeEach(() => {
    fetchMock.mockClear();
  });

  it("sends null addressGeohash to clear confirmation", async () => {
    await persistBranchDraft(
      "br-test",
      {
        name: "A",
        city: "Краснодар",
        address: "New street",
        addressCity: null,
        addressDistrict: null,
        addressGeohash: null,
        description: "",
        photoUrl: "",
        workingHours: null,
        specializations: [],
        storeCategories: [],
      },
      emptyBranchContactsForm(),
    );

    const call = fetchMock.mock.calls[0];
    const init = call?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { addressGeohash?: unknown };
    expect(body.addressGeohash).toBe(null);
  });
});
