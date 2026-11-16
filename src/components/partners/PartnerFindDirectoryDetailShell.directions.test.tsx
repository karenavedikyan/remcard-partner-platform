import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartnerFindDirectoryDetailShell } from "./PartnerFindDirectoryDetailShell";
import { PartnerSearchResultCard, searchResultReciprocal } from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";
import type { PartnerSideProfile } from "@/lib/partnership-rules";

type Slot = { partnershipId: string; status: string } | null;
const slot = (status: string): Slot => ({ partnershipId: `row-${status}`, status });

const result = (outgoing: Slot, incoming: Slot, extra: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "p-1", displayName: "Новая компания", city: "Казань", photoUrl: null, description: null,
  specializations: [], badges: [], storeCategories: [], branches: [], rating: null, ratingCount: 0,
  partnershipStatus: outgoing?.status ?? incoming?.status ?? null,
  partnerType: "COMPANY", partnerTypeLabel: "Компания",
  workingProductLabels: ["Двери"], workingServiceLabels: [], workingStageLabels: [],
  partnershipDirections: { outgoing, incoming },
  ...extra,
});

const business: PartnerSideProfile = { id: "me", partnerType: "STORE", partnerActivities: ["STORE"], storeCategories: [], specializations: [] };
const agent: PartnerSideProfile = { id: "me", partnerType: "COMPANY", partnerActivities: ["AGENT"], storeCategories: [], specializations: [] };

function renderDetail(partner: PartnerSearchResult, viewerSide = business, onReciprocalInvite = vi.fn()) {
  render(
    <PartnerFindDirectoryDetailShell
      partner={partner}
      onBack={() => {}}
      onInvite={() => {}}
      directionContext={{ audience: undefined, viewerSide, onReciprocalInvite }}
    />,
  );
  return onReciprocalInvite;
}

describe("search detail shows the same direction state and reciprocal action as the result card", () => {
  it("offers the card's reciprocal CTA after a one-way accepted partner and hands the direction over once", async () => {
    const partner = result(slot("ACTIVE"), null);
    const onReciprocalInvite = renderDetail(partner);
    const cta = screen.getByTestId("partner-find-directory-detail-reciprocal");
    expect(cta).toHaveTextContent(searchResultReciprocal(partner, business)!.label);
    expect(cta).toHaveTextContent("Предложить: пусть рекомендуют нас");
    expect(cta).toBeEnabled();
    expect(screen.getByTestId("partner-find-directory-detail-direction")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-find-directory-detail-invite")).toBeNull();
    await userEvent.click(cta);
    expect(onReciprocalInvite).toHaveBeenCalledTimes(1);
    expect(onReciprocalInvite).toHaveBeenCalledWith("INVITER_RECEIVES");
  });

  it("shows the active status once, not again as a blocked-reason note", () => {
    renderDetail(result(slot("ACTIVE"), null));
    expect(screen.getAllByText("Активно")).toHaveLength(1);
    expect(screen.queryByTestId("partner-find-directory-detail-invite-blocked")).toBeNull();
  });

  it("offers the issuing request when only the incoming direction is agreed and the partner can receive", async () => {
    const onReciprocalInvite = renderDetail(result(null, slot("ACTIVE"), { canReceiveCertificates: true }));
    await userEvent.click(screen.getByTestId("partner-find-directory-detail-reciprocal"));
    expect(onReciprocalInvite).toHaveBeenCalledWith("INVITER_ISSUES");
  });

  it("matches the card for every case: same CTA presence and same direction marker", () => {
    const cases: Array<[string, PartnerSearchResult, PartnerSideProfile]> = [
      ["one-way", result(slot("ACTIVE"), null), business],
      ["mutual", result(slot("ACTIVE"), slot("ACTIVE")), business],
      ["pending reverse", result(slot("ACTIVE"), slot("INVITED")), business],
      ["ended reverse", result(slot("ACTIVE"), slot("ENDED")), business],
      ["pending only", result(slot("INVITED"), null), business],
      ["ended only", result(slot("ENDED"), null), business],
      ["agent viewer cannot receive", result(slot("ACTIVE"), null), agent],
      ["receiving-ineligible agent target", result(null, slot("ACTIVE"), { canReceiveCertificates: false, partnerActivities: ["AGENT"] }), business],
    ];
    for (const [name, partner, viewerSide] of cases) {
      const { unmount: unmountCard } = render(
        <PartnerSearchResultCard partner={partner} title="t" showPublishedTerms={false} inviteDisabled={false}
          onInvite={() => {}} directionContext={{ viewerSide, onReciprocalInvite: () => {} }} />,
      );
      const cardCta = Boolean(screen.queryByTestId("agent-partner-search-result-reciprocal"));
      const cardMarker = Boolean(screen.queryByTestId("agent-partner-search-result-direction"));
      unmountCard();
      const { unmount } = render(
        <PartnerFindDirectoryDetailShell partner={partner} onBack={() => {}} onInvite={() => {}}
          directionContext={{ viewerSide, onReciprocalInvite: () => {} }} />,
      );
      expect(Boolean(screen.queryByTestId("partner-find-directory-detail-reciprocal")), `${name}: CTA`).toBe(cardCta);
      expect(Boolean(screen.queryByTestId("partner-find-directory-detail-direction")), `${name}: marker`).toBe(cardMarker);
      unmount();
    }
  });

  it("keeps the disabled generic invite and no reciprocal action for a mutual partner", () => {
    renderDetail(result(slot("ACTIVE"), slot("ACTIVE")));
    expect(screen.queryByTestId("partner-find-directory-detail-reciprocal")).toBeNull();
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toBeDisabled();
    expect(screen.getByTestId("partner-find-directory-detail-direction")).toBeInTheDocument();
  });

  it("is unchanged without a direction context", () => {
    render(<PartnerFindDirectoryDetailShell partner={result(slot("ACTIVE"), null)} onBack={() => {}} onInvite={() => {}} />);
    expect(screen.queryByTestId("partner-find-directory-detail-reciprocal")).toBeNull();
    expect(screen.queryByTestId("partner-find-directory-detail-direction")).toBeNull();
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toBeDisabled();
  });
});
