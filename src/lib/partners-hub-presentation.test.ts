import { describe, expect, it } from "vitest";
import { discussionContextToInviteTarget } from "./discussion-invite-ui";
import { resolvePartnersHubPresentation } from "./partners-hub-presentation";
import {
  resolveInviteTradeSideCategories,
  searchResultToPartnerSide,
  profileUserToPartnerSide,
} from "./partnership-rules";
import type { PartnerSearchResult, ProProfileUser } from "@/lib/types";

describe("resolvePartnersHubPresentation", () => {
  it("prefers agent r04 when r04 eligible even if r06 eligible", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: true },
      r06: { featureEnabled: true, eligible: true },
    });
    expect(p.audience).toBe("agent-r04");
    expect(p.defaultSearchRole).toBe("agent");
  });

  it("uses specialist shared shell only when r06 feature and eligible", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: false },
      r06: { featureEnabled: true, eligible: true },
    });
    expect(p.audience).toBe("specialist-r04");
    expect(p.defaultSearchRole).toBeUndefined();
  });

  it("does not enable specialist shell for r04 flag without r04 eligible", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: false },
      r06: { featureEnabled: true, eligible: true },
    });
    expect(p.shell).toBe("shared-r04");
    expect(p.audience).toBe("specialist-r04");
  });

  it("does not enable specialist shell when r06 eligible is false (employee gate)", () => {
    const p = resolvePartnersHubPresentation({
      r04: null,
      r06: { featureEnabled: true, eligible: false },
    });
    expect(p.shell).toBe("legacy");
    expect(p.audience).toBe("legacy");
  });

  it("does not enable specialist shell for org_owner or employed_view style denial", () => {
    for (const eligible of [false]) {
      const p = resolvePartnersHubPresentation({
        r04: { featureEnabled: false, eligible: false },
        r06: { featureEnabled: true, eligible },
      });
      expect(p.audience).toBe("legacy");
    }
  });

  it("falls back to legacy when r06 gate off or missing", () => {
    expect(
      resolvePartnersHubPresentation({
        r04: { featureEnabled: false, eligible: false },
        r06: { featureEnabled: false, eligible: false },
      }).audience,
    ).toBe("legacy");
    expect(
      resolvePartnersHubPresentation({
        r04: null,
        r06: null,
      }).audience,
    ).toBe("legacy");
  });

  it("does not attach agent defaultSearchRole for legacy store path", () => {
    const p = resolvePartnersHubPresentation({
      r04: { featureEnabled: true, eligible: false },
      r06: { featureEnabled: false, eligible: false },
    });
    expect(p.shell).toBe("legacy");
    expect(p.defaultSearchRole).toBeUndefined();
  });
});

describe("discussionContextToInviteTarget", () => {
  const masterInviter = profileUserToPartnerSide(
    {
      id: "spec-1",
      partnerType: "MASTER",
      storeCategories: [],
      specializations: ["design"],
    } as ProProfileUser,
    null,
  );

  it("maps STORE counterparty with doors to invite categories (not general fallback)", () => {
    const target = discussionContextToInviteTarget({
      id: "disc-1",
      recipientLabel: "Магазин",
      cooperationSubject: "Двери",
      status: "JOINED",
      role: "author",
      counterpartyUserId: "store-1",
      counterpartyDisplayName: "Магазин «Юг»",
      counterpartyCity: "Краснодар",
      counterpartyPartnerType: "STORE",
      counterpartyStoreCategories: ["doors"],
      counterpartySpecializations: [],
      canProposeTerms: true,
    });
    expect(target?.storeCategories).toEqual(["doors"]);
    const resolved = resolveInviteTradeSideCategories(
      masterInviter,
      searchResultToPartnerSide(target! satisfies PartnerSearchResult),
    );
    expect(resolved.categories).toEqual(["doors"]);
    expect(resolved.blockedReason).toBeUndefined();
  });

  it("uses organization STORE ownership for trade side", () => {
    const target = discussionContextToInviteTarget({
      id: "disc-2",
      recipientLabel: "Сеть",
      cooperationSubject: "Плитка",
      status: "JOINED",
      role: "participant",
      counterpartyUserId: "owner-1",
      counterpartyDisplayName: "Сеть магазинов",
      counterpartyCity: "Сочи",
      counterpartyPartnerType: "MASTER",
      counterpartyStoreCategories: ["doors", "tiles"],
      counterpartyOrganizationName: "Сеть магазинов",
      counterpartyOrganizationPartnerType: "STORE",
      canProposeTerms: true,
    });
    const side = searchResultToPartnerSide(target! satisfies PartnerSearchResult);
    expect(side.isStoreOwner).toBe(true);
    const resolved = resolveInviteTradeSideCategories(masterInviter, side);
    expect(resolved.categories).toEqual(["doors", "tiles"]);
  });
});
