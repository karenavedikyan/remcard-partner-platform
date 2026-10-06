import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDefaultInviteRows,
  buildGeneralInviteRow,
  countNeedsMyResponse,
  defaultSearchRoleForUser,
  getPartnershipUiActions,
  inviteRowsToTerms,
  partnershipNeedsMyResponse,
  resolveInviteTradeSideCategories,
  validateInviteRows,
} from "./partnership-rules.ts";
import type { Partnership } from "./types.ts";

const storeInviter = {
  id: "store-1",
  partnerType: "STORE",
  storeCategories: ["doors", "plumbing", "tiles"],
  specializations: [],
  isStoreOwner: true,
};

const masterInviter = {
  id: "master-1",
  partnerType: "MASTER",
  storeCategories: [],
  specializations: ["doors", "plumbing"],
};

const masterTarget = {
  id: "master-2",
  partnerType: "MASTER",
  storeCategories: [],
  specializations: ["tiles"],
};

const storeTarget = {
  id: "store-2",
  partnerType: "STORE",
  storeCategories: ["doors", "plumbing"],
  specializations: [],
  isStoreOwner: true,
};

function basePartnership(overrides: Partial<Partnership>): Partnership {
  return {
    id: "p1",
    status: "INVITED",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "master-1",
    terms: [],
    storeUser: { id: "store-1", displayName: "Store", city: null, specializations: [], storeCategories: [], partnerType: "STORE" },
    proUser: { id: "master-1", displayName: "Master", city: null, specializations: [], storeCategories: [], partnerType: "MASTER" },
    ...overrides,
  };
}

describe("partnership invite rules", () => {
  it("uses inviter categories for store inviting master", () => {
    const result = resolveInviteTradeSideCategories(storeInviter, masterTarget);
    assert.deepEqual(result.categories, ["doors", "plumbing", "tiles"]);
    assert.equal(result.mode, "store");
  });

  it("does not slice categories and keeps all trade-side values", () => {
    const rows = buildDefaultInviteRows(storeInviter.storeCategories);
    assert.equal(rows.length, 3);
    const terms = inviteRowsToTerms(rows);
    assert.equal(terms.length, 3);
    assert.equal(terms[0]?.storePercent, 10);
  });

  it("uses target store categories when master invites store", () => {
    const result = resolveInviteTradeSideCategories(masterInviter, storeTarget);
    assert.deepEqual(result.categories, ["doors", "plumbing"]);
  });

  it("uses inviter categories when master invites master", () => {
    const result = resolveInviteTradeSideCategories(masterInviter, masterTarget);
    assert.deepEqual(result.categories, ["doors", "plumbing"]);
  });

  it("requires explicit general row when no categories", () => {
    const emptyInviter = { ...masterInviter, specializations: [], storeCategories: [] };
    const result = resolveInviteTradeSideCategories(emptyInviter, masterTarget);
    assert.equal(result.categories.length, 0);
    const general = buildGeneralInviteRow();
    assert.equal(general.category, "general");
    assert.equal(validateInviteRows([general]), null);
  });

  it("rejects invite rows without active categories", () => {
    assert.match(validateInviteRows([{ category: "doors", percent: "10", excluded: true }]) ?? "", /хотя бы одну/);
  });
});

describe("partnership search semantics", () => {
  it("defaults store owners to role=store search", () => {
    assert.equal(defaultSearchRoleForUser(storeInviter), "store");
    assert.equal(defaultSearchRoleForUser(masterInviter), "pro");
  });
});

describe("partnership action rules", () => {
  it("shows accept/reject to invite receiver", () => {
    const actions = getPartnershipUiActions(basePartnership({ status: "INVITED" }), "master-1");
    assert.deepEqual(
      actions.map((item) => item.kind),
      ["accept", "reject"],
    );
  });

  it("shows cancel to invite author", () => {
    const actions = getPartnershipUiActions(basePartnership({ status: "INVITED" }), "store-1");
    assert.deepEqual(actions.map((item) => item.kind), ["cancel"]);
  });

  it("allows accept_pending only for non-author in PENDING", () => {
    const pending = basePartnership({
      status: "PENDING",
      pendingProposedBy: "master-1",
    });
    const responder = getPartnershipUiActions(pending, "store-1");
    assert.deepEqual(responder.map((item) => item.kind), ["accept_pending", "reject"]);

    const author = getPartnershipUiActions(pending, "master-1");
    assert.deepEqual(author.map((item) => item.kind), ["withdraw_counter"]);
  });

  it("blocks accept_pending for pending author", () => {
    const pending = basePartnership({
      status: "PENDING",
      initiatedBy: "store-1",
      pendingProposedBy: "store-1",
    });
    const actions = getPartnershipUiActions(pending, "store-1");
    assert.equal(actions[0]?.kind, "waiting");
    assert.equal(partnershipNeedsMyResponse(pending, "store-1"), false);
  });

  it("counts attention using pendingProposedBy not initiatedBy", () => {
    const list = [
      basePartnership({ status: "INVITED", initiatedBy: "store-1" }),
      basePartnership({
        id: "p2",
        status: "PENDING",
        initiatedBy: "store-1",
        pendingProposedBy: "master-1",
      }),
    ];
    assert.equal(countNeedsMyResponse(list, "master-1"), 1);
    assert.equal(countNeedsMyResponse(list, "store-1"), 1);
  });
});
