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
  INVITE_PARTNER_UNKNOWN_BLOCK_MESSAGE,
  inviteTargetStoreOwnershipUnknown,
  resolveInviteTradeSideCategories,
  searchResultToPartnerSide,
  validateInviteRows,
} from "./partnership-rules.ts";
import type { PartnerSearchResult } from "./types.ts";
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
    assert.equal(terms[0]?.categoryLabel, "Двери");
  });

  it("inviteRowsToTerms sets Russian categoryLabel for all store keys", () => {
    const terms = inviteRowsToTerms([
      { category: "flooring", percent: "10", excluded: false },
      { category: "handles", percent: "5", excluded: false },
    ]);
    assert.equal(terms[0]?.categoryLabel, "Напольные покрытия");
    assert.equal(terms[1]?.categoryLabel, "Фурнитура и замки");
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

  it("uses inviter categories for COMPANY with non-STORE organization (not org name heuristic)", () => {
    const renovationMaster = {
      ...masterInviter,
      specializations: ["renovation"],
    };
    const companyTarget = searchResultToPartnerSide({
      id: "company-1",
      displayName: "Компания",
      city: null,
      photoUrl: null,
      description: null,
      specializations: [],
      badges: [],
      storeCategories: ["doors"],
      partnerType: "COMPANY",
      organizationName: "ООО Компания",
      organizationPartnerType: "COMPANY",
      branches: [],
      rating: null,
      ratingCount: 0,
      partnershipStatus: null,
    } satisfies PartnerSearchResult);
    const result = resolveInviteTradeSideCategories(renovationMaster, companyTarget);
    assert.deepEqual(result.categories, ["renovation"]);
  });

  it("uses target categories for STORE partnerType", () => {
    const result = resolveInviteTradeSideCategories(masterInviter, storeTarget);
    assert.deepEqual(result.categories, ["doors", "plumbing"]);
  });

  it("uses target categories for confirmed STORE organization owner", () => {
    const storeOrgOwner = searchResultToPartnerSide({
      id: "owner-1",
      displayName: "Владелец сети",
      city: null,
      photoUrl: null,
      description: null,
      specializations: ["renovation"],
      badges: [],
      storeCategories: ["doors", "tiles"],
      partnerType: "MASTER",
      organizationName: "Сеть магазинов",
      organizationPartnerType: "STORE",
      branches: [],
      rating: null,
      ratingCount: 0,
      partnershipStatus: null,
    } satisfies PartnerSearchResult);
    const result = resolveInviteTradeSideCategories(masterInviter, storeOrgOwner);
    assert.deepEqual(result.categories, ["doors", "tiles"]);
  });

  it("uses inviter categories for MASTER without organization", () => {
    const soloMaster = searchResultToPartnerSide({
      id: "solo-1",
      displayName: "Мастер",
      city: null,
      photoUrl: null,
      description: null,
      specializations: ["plumbing"],
      badges: [],
      storeCategories: [],
      partnerType: "MASTER",
      branches: [],
      rating: null,
      ratingCount: 0,
      partnershipStatus: null,
    } satisfies PartnerSearchResult);
    const result = resolveInviteTradeSideCategories(masterInviter, soloMaster);
    assert.deepEqual(result.categories, ["doors", "plumbing"]);
  });

  it("blocks invite when organization type is unknown and may change trade side", () => {
    const side = searchResultToPartnerSide({
      id: "company-2",
      displayName: "Компания",
      city: null,
      photoUrl: null,
      description: null,
      specializations: [],
      badges: [],
      storeCategories: ["doors"],
      partnerType: "COMPANY",
      organizationName: "ООО Компания",
      branches: [],
      rating: null,
      ratingCount: 0,
      partnershipStatus: null,
    } satisfies PartnerSearchResult);
    assert.equal(side.isStoreOwner, undefined);
    assert.equal(inviteTargetStoreOwnershipUnknown(side), true);
    const result = resolveInviteTradeSideCategories(
      { ...masterInviter, specializations: ["renovation"] },
      side,
    );
    assert.equal(result.blockedReason, INVITE_PARTNER_UNKNOWN_BLOCK_MESSAGE);
    assert.deepEqual(result.categories, []);
  });

  it("allows store inviter even when target organization type is unknown", () => {
    const unknownOrgTarget = searchResultToPartnerSide({
      id: "company-3",
      displayName: "Компания",
      city: null,
      photoUrl: null,
      description: null,
      specializations: [],
      badges: [],
      storeCategories: ["doors"],
      partnerType: "COMPANY",
      organizationName: "ООО Компания",
      branches: [],
      rating: null,
      ratingCount: 0,
      partnershipStatus: null,
    } satisfies PartnerSearchResult);
    const result = resolveInviteTradeSideCategories(storeInviter, unknownOrgTarget);
    assert.equal(result.blockedReason, undefined);
    assert.deepEqual(result.categories, ["doors", "plumbing", "tiles"]);
  });

  it("allows peer invite when target has no organization name", () => {
    const solo = searchResultToPartnerSide({
      id: "solo-2",
      displayName: "Мастер",
      city: null,
      photoUrl: null,
      description: null,
      specializations: ["plumbing"],
      badges: [],
      storeCategories: [],
      partnerType: "MASTER",
      branches: [],
      rating: null,
      ratingCount: 0,
      partnershipStatus: null,
    } satisfies PartnerSearchResult);
    assert.equal(inviteTargetStoreOwnershipUnknown(solo), false);
    const result = resolveInviteTradeSideCategories(masterInviter, solo);
    assert.equal(result.blockedReason, undefined);
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
