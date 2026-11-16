import { describe, expect, it } from "vitest";
import type { PartnerSearchResult, Partnership } from "@/lib/types";
import {
  audienceHasDirectionTabs,
  canReceiveRecommendations,
  countByDirection,
  countDistinctCounterparties,
  directionBadgeModel,
  directionClientsHref,
  directionTabCopy,
  filterRowsByDirection,
  formatPurchaseLimit,
  formatValidityDays,
  inviteDirectionOptions,
  rowDirection,
  searchDirectionBadge,
} from "./direction";
import {
  buildDirectionalInviteBody,
  defaultInviteOfferForm,
  normalizeInviteNote,
  parseInviteOfferForm,
} from "./invite-offer";

const ME = "me";
function row(id: string, storeUserId: string, proUserId: string, extra: Partial<Partnership> = {}): Partnership {
  return { id, storeUserId, proUserId, status: "ACTIVE", ...extra } as unknown as Partnership;
}
function withInfo(p: Partnership, direction: "incoming" | "outgoing", reverseStatus: string | null): Partnership {
  const counterparty = direction === "incoming" ? p.proUserId : p.storeUserId;
  return {
    ...p,
    directionInfo: {
      direction,
      issuerUserId: direction === "incoming" ? counterparty : ME,
      receiverUserId: direction === "incoming" ? ME : counterparty,
      legacyInverted: false,
      counterpartyUserId: counterparty,
      reversePartnershipId: reverseStatus ? `${p.id}-rev` : null,
      reverseStatus,
    },
  } as Partnership;
}

describe("direction helpers", () => {
  it("falls back to storeUserId when the server sent no directionInfo", () => {
    expect(rowDirection(row("a", ME, "x"), ME)).toBe("incoming");
    expect(rowDirection(row("b", "x", ME), ME)).toBe("outgoing");
  });

  it("trusts directionInfo, including a legacy inverted agent row", () => {
    const inverted = {
      ...row("c", ME, "biz"),
      directionInfo: { direction: "outgoing", legacyInverted: true, counterpartyUserId: "biz" },
    } as unknown as Partnership;
    expect(rowDirection(inverted, ME)).toBe("outgoing");
  });

  it("counts one row per direction but distinct counterparties for partners", () => {
    const rows = [row("a", ME, "x"), row("b", "x", ME), row("c", ME, "y")];
    expect(countByDirection(rows, ME)).toEqual({ incoming: 2, outgoing: 1 });
    expect(countDistinctCounterparties(rows, ME)).toBe(2);
    expect(filterRowsByDirection(rows, ME, "outgoing").map((r) => r.id)).toEqual(["b"]);
  });

  it("uses business and specialist tab copy; agents have no tabs", () => {
    expect(directionTabCopy("business-store-r04").incoming).toBe("Нас рекомендуют");
    expect(directionTabCopy("business-company-r04").outgoing).toBe("Мы рекомендуем");
    expect(directionTabCopy("specialist-r04")).toMatchObject({
      incoming: "Меня рекомендуют",
      outgoing: "Я рекомендую",
    });
    expect(audienceHasDirectionTabs("business-store-r04")).toBe(true);
    expect(audienceHasDirectionTabs("business-company-r04")).toBe(true);
    expect(audienceHasDirectionTabs("specialist-r04")).toBe(true);
    expect(audienceHasDirectionTabs("agent-r04")).toBe(false);
    expect(audienceHasDirectionTabs(undefined)).toBe(false);
  });

  it("shows the mutual badge only when both directions are ACTIVE", () => {
    const mutual = withInfo(row("a", ME, "x"), "incoming", "ACTIVE");
    expect(directionBadgeModel(mutual, ME, "business-store-r04").glyph).toBe("↑↓");
    for (const status of ["INVITED", "PAUSED", "ENDED"]) {
      const m = directionBadgeModel(withInfo(row("a", ME, "x"), "incoming", status), ME, "business-store-r04");
      expect(m.glyph).toBe("↓");
      expect(m.description).toMatch(/Встречное направление/);
    }
    const paused = withInfo(row("a", ME, "x", { status: "PAUSED" }), "incoming", "ACTIVE");
    expect(directionBadgeModel(paused, ME).glyph).toBe("↓");
    expect(directionBadgeModel(withInfo(row("b", "x", ME), "outgoing", null), ME).glyph).toBe("↑");
  });

  it("builds the search badge from per-direction state", () => {
    const search = (partnershipDirections: unknown) => ({ partnershipDirections }) as unknown as PartnerSearchResult;
    expect(searchDirectionBadge(search({ outgoing: null, incoming: null }))).toBeNull();
    expect(searchDirectionBadge(search({ outgoing: { partnershipId: "o", status: "ACTIVE" }, incoming: null }))?.glyph).toBe("↑");
    expect(searchDirectionBadge(search({ outgoing: null, incoming: { partnershipId: "i", status: "ACTIVE" } }))?.glyph).toBe("↓");
    expect(
      searchDirectionBadge(
        search({ outgoing: { partnershipId: "o", status: "ACTIVE" }, incoming: { partnershipId: "i", status: "ACTIVE" } }),
      )?.glyph,
    ).toBe("↑↓");
    expect(
      searchDirectionBadge(search({ outgoing: { partnershipId: "o", status: "INVITED" }, incoming: null }))?.pending,
    ).toBe(true);
    expect(searchDirectionBadge(search({ outgoing: { partnershipId: "o", status: "ENDED" }, incoming: null }))).toBeNull();
  });

  it("offers invite directions by eligibility; a pure agent only issues", () => {
    const store = { partnerType: "STORE", partnerActivities: ["STORE"] };
    const company = { partnerType: "COMPANY", partnerActivities: ["COMPANY"] };
    const agent = { partnerType: "COMPANY", partnerActivities: ["AGENT"] };
    expect(inviteDirectionOptions(store, company).map((o) => o.value)).toEqual(["INVITER_RECEIVES", "INVITER_ISSUES"]);
    expect(inviteDirectionOptions(agent, store).map((o) => o.value)).toEqual(["INVITER_ISSUES"]);
    expect(inviteDirectionOptions(store, agent).map((o) => o.value)).toEqual(["INVITER_RECEIVES"]);
    // server verdict wins over the partnerType heuristic (a pure agent is stored as COMPANY)
    expect(inviteDirectionOptions(store, { partnerType: "COMPANY", canReceive: false }).map((o) => o.value)).toEqual(["INVITER_RECEIVES"]);
    expect(inviteDirectionOptions(store, { partnerType: "COMPANY", canReceive: true }).map((o) => o.value)).toEqual(["INVITER_RECEIVES", "INVITER_ISSUES"]);
    expect(canReceiveRecommendations(agent)).toBe(false);
    expect(canReceiveRecommendations({ partnerType: "MASTER" })).toBe(true);
  });

  it("links to the exact receiving partner only for outgoing rows", () => {
    expect(directionClientsHref(withInfo(row("a", "x", ME), "outgoing", null), ME)).toBe(
      "/clients?direction=at-partners&partnerId=x",
    );
    expect(directionClientsHref(withInfo(row("b", ME, "x"), "incoming", null), ME)).toBeNull();
  });

  it("pluralises validity and purchase limits", () => {
    expect(formatValidityDays(1)).toBe("1 день");
    expect(formatValidityDays(3)).toBe("3 дня");
    expect(formatValidityDays(11)).toBe("11 дней");
    expect(formatPurchaseLimit(21)).toBe("21 покупка");
    expect(formatPurchaseLimit(5)).toBe("5 покупок");
  });
});

describe("invite offer", () => {
  it("validates restriction bounds", () => {
    const base = defaultInviteOfferForm();
    expect(parseInviteOfferForm(base).ok).toBe(true);
    expect(parseInviteOfferForm({ ...base, validityDays: "0" }).ok).toBe(false);
    expect(parseInviteOfferForm({ ...base, validityDays: "3651" }).ok).toBe(false);
    expect(parseInviteOfferForm({ ...base, purchaseLimit: "10001" }).ok).toBe(false);
    expect(parseInviteOfferForm({ ...base, minimumPurchase: "-5" }).ok).toBe(false);
    expect(parseInviteOfferForm({ ...base, exclusionsText: "x".repeat(501) }).ok).toBe(false);
    const ok = parseInviteOfferForm({ ...base, validityDays: "14", purchaseLimit: "3", minimumPurchase: "1000", exclusionsText: " акции " });
    expect(ok).toEqual({
      ok: true,
      restrictions: { validityDays: 14, purchaseLimit: 3, minimumPurchaseAmount: 1000, promotionsCompatible: false, exclusionsText: "акции" },
    });
  });

  it("caps the note at 1000 and keeps line breaks", () => {
    expect(normalizeInviteNote("a".repeat(1001)).ok).toBe(false);
    expect(normalizeInviteNote("a".repeat(1000)).ok).toBe(true);
    expect(normalizeInviteNote("строка 1\r\nстрока 2")).toEqual({ ok: true, note: "строка 1\nстрока 2" });
    expect(normalizeInviteNote("   ")).toEqual({ ok: true, note: null });
  });

  it("builds a terms-less request for issuing and an exact offer for receiving", () => {
    expect(
      buildDirectionalInviteBody({ targetUserId: "t", direction: "INVITER_ISSUES", note: "n", terms: [], restrictions: null }),
    ).toEqual({ targetUserId: "t", note: "n", direction: "INVITER_ISSUES", cooperationRequest: true, terms: [] });
    const restrictions = { validityDays: 7, purchaseLimit: 2, minimumPurchaseAmount: null, promotionsCompatible: true, exclusionsText: null };
    const terms = [
      { category: "doors", storePercent: 0 },
      { category: "flooring", storePercent: 8 },
    ] as never;
    const body = buildDirectionalInviteBody({ targetUserId: "t", direction: "INVITER_RECEIVES", note: null, terms, restrictions });
    expect(body).toMatchObject({ direction: "INVITER_RECEIVES", certificatePolicy: restrictions });
    expect(body.terms).toHaveLength(2);
    expect(() =>
      buildDirectionalInviteBody({ targetUserId: "t", direction: "INVITER_RECEIVES", note: null, terms, restrictions: null }),
    ).toThrow();
  });
});
