import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartnerSearchResultCard, searchResultReciprocal } from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";
import type { PartnerSideProfile } from "@/lib/partnership-rules";

type Slot = { partnershipId: string; status: string } | null;
const result = (outgoing: Slot, incoming: Slot, partnerType = "COMPANY"): PartnerSearchResult => ({
  id: "p-1", displayName: "Опт", city: "Казань", photoUrl: null, description: null,
  specializations: [], badges: [], storeCategories: [], branches: [], rating: null, ratingCount: 0,
  partnershipStatus: outgoing?.status ?? incoming?.status ?? null,
  partnerType, partnerTypeLabel: "Компания",
  workingProductLabels: ["Двери"], workingServiceLabels: [], workingStageLabels: [],
  partnershipDirections: { outgoing, incoming },
});
const business: PartnerSideProfile = { id: "me", partnerType: "STORE", partnerActivities: ["STORE"], storeCategories: [], specializations: [] };
const agent: PartnerSideProfile = { id: "me", partnerType: "COMPANY", partnerActivities: ["AGENT"], storeCategories: [], specializations: [] };
const active = (id: string): Slot => ({ partnershipId: id, status: "ACTIVE" });

describe("searchResultReciprocal", () => {
  it("proposes the missing direction after an agreed one, never after a pending one", () => {
    expect(searchResultReciprocal(result(active("o"), null), business)?.direction).toBe("INVITER_RECEIVES");
    expect(searchResultReciprocal(result(null, active("i")), business)?.direction).toBe("INVITER_ISSUES");
    expect(searchResultReciprocal(result({ partnershipId: "o", status: "PAUSED" }, null), business)?.direction).toBe("INVITER_RECEIVES");
    expect(searchResultReciprocal(result({ partnershipId: "o", status: "INVITED" }, null), business)).toBeNull();
    expect(searchResultReciprocal(result(active("o"), { partnershipId: "i", status: "INVITED" }), business)).toBeNull();
    expect(searchResultReciprocal(result(active("o"), active("i")), business)).toBeNull();
  });

  it("never offers a direction that already has an ENDED row: the server does not revive it", () => {
    expect(searchResultReciprocal(result(active("o"), { partnershipId: "i", status: "ENDED" }), business)).toBeNull();
    expect(searchResultReciprocal(result({ partnershipId: "o", status: "ENDED" }, active("i")), business)).toBeNull();
  });

  it("does not offer a receiving direction to a pure agent target even when partnerType looks like a business", () => {
    const agentTarget = { ...result(null, active("i")), canReceiveCertificates: false };
    expect(searchResultReciprocal(agentTarget, business)).toBeNull();
    const businessTarget = { ...result(null, active("i")), canReceiveCertificates: true };
    expect(searchResultReciprocal(businessTarget, business)?.direction).toBe("INVITER_ISSUES");
  });

  it("never offers receiving to a pure agent", () => {
    expect(searchResultReciprocal(result(active("o"), null), agent)).toBeNull();
  });

  it("uses specialist wording", () => {
    expect(searchResultReciprocal(result(active("o"), null), business, "specialist-r04")?.label).toMatch(/меня/);
  });
});

describe("PartnerSearchResultCard direction state", () => {
  function mount(partner: PartnerSearchResult, onReciprocalInvite = vi.fn()) {
    render(
      <PartnerSearchResultCard
        partner={partner}
        title="Опт"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
        directionContext={{ audience: "business-store-r04", viewerSide: business, onReciprocalInvite }}
      />,
    );
    return onReciprocalInvite;
  }

  it("shows a direction badge and the reciprocal action which reports the direction", async () => {
    const onReciprocal = mount(result(active("o"), null));
    expect(screen.getByTestId("agent-partner-search-result-direction")).toHaveAttribute("data-direction-glyph", "↑");
    await userEvent.click(screen.getByTestId("agent-partner-search-result-reciprocal"));
    expect(onReciprocal).toHaveBeenCalledWith("INVITER_RECEIVES");
  });

  it("shows the mutual state without a reciprocal action", () => {
    mount(result(active("o"), active("i")));
    expect(screen.getByTestId("agent-partner-search-result-direction")).toHaveAttribute("data-direction-glyph", "↑↓");
    expect(screen.queryByTestId("agent-partner-search-result-reciprocal")).toBeNull();
  });

  it("renders without direction elements when no directionContext is passed", () => {
    render(
      <PartnerSearchResultCard partner={result(active("o"), null)} title="Опт" showPublishedTerms={false}
        inviteDisabled={false} onInvite={() => undefined} />,
    );
    expect(screen.queryByTestId("agent-partner-search-result-direction")).toBeNull();
    expect(screen.queryByTestId("agent-partner-search-result-reciprocal")).toBeNull();
  });
});
