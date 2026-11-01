import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PartnerSearchResultCard } from "./PartnerSearchResultCard";

vi.mock("@/components/partners/PartnerGeneralTermsDetails", () => ({
  PartnerGeneralTermsDetails: () => null,
}));

describe("PartnerSearchResultCard P25f pure agent DTO parity", () => {
  it("renders AGENT contract type without MASTER/PRO rename", () => {
    render(
      <PartnerSearchResultCard
        partner={{
          id: "pure-agent-1",
          displayName: "Седа Агент",
          city: "Краснодар",
          photoUrl: null,
          description: null,
          specializations: [],
          badges: [],
          storeCategories: [],
          branches: [],
          rating: null,
          ratingCount: 0,
          partnershipStatus: null,
          partnerType: "AGENT",
          partnerTypeLabel: "Агент",
          workingProductLabels: [],
          workingServiceLabels: [],
          workingStageLabels: [],
        }}
        title="Седа Агент"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-type")).toHaveTextContent("Агент");
    expect(screen.getByTestId("agent-partner-search-result-card")).toHaveAttribute("data-cover-tone", "agent");
    expect(screen.getByTestId("agent-partner-search-result-invite")).toBeEnabled();
  });

  it("keeps ACTIVE partnership invite blocked (real eligibility)", () => {
    render(
      <PartnerSearchResultCard
        partner={{
          id: "co-active",
          displayName: "Компания",
          city: "Москва",
          photoUrl: null,
          description: null,
          specializations: [],
          badges: [],
          storeCategories: [],
          branches: [],
          rating: null,
          ratingCount: 0,
          partnershipStatus: "ACTIVE",
          partnerType: "COMPANY",
          partnerTypeLabel: "Компания",
        }}
        title="Компания"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
      />,
    );
    expect(screen.getByTestId("agent-partner-search-result-invite")).toBeDisabled();
    expect(screen.getByTestId("agent-partner-search-result-invite-blocked")).toBeTruthy();
  });
});
