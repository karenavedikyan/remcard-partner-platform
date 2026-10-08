import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describePendingTermChange } from "./term-change-labels.ts";
import type { Partnership, TermChangeRequest } from "./types.ts";

function basePartnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "p1",
    status: "ACTIVE",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "pro-1",
    terms: [],
    storeUser: {
      id: "store-1",
      displayName: "ОПТОВИК",
      city: null,
      specializations: [],
      storeCategories: [],
      partnerType: "STORE",
      organizationName: "ОПТОВИК",
    },
    proUser: {
      id: "pro-1",
      displayName: "Мастер",
      city: null,
      specializations: [],
      storeCategories: [],
      partnerType: "MASTER",
    },
    ...overrides,
  };
}

const pendingRequest: TermChangeRequest = {
  id: "r1",
  status: "PENDING",
  requestedBy: "store-1",
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  changes: [{ category: "general", newPercent: 15 }],
};

describe("term change labels", () => {
  it("shows proposer waiting copy for initiator", () => {
    const copy = describePendingTermChange(pendingRequest, basePartnership(), "store-1");
    assert.match(copy.heading, /Вы предложили/);
    assert.match(copy.hint, /Ожидаем решения Мастер/);
    assert.equal(copy.canRespond, false);
  });

  it("shows counterparty proposal for responder", () => {
    const copy = describePendingTermChange(pendingRequest, basePartnership(), "pro-1");
    assert.match(copy.heading, /ОПТОВИК предлагает изменить/);
    assert.equal(copy.canRespond, true);
  });
});
