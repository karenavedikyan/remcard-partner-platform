import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartnerSearchResultCard, searchResultCoverTone, searchResultTypeLabel } from "./PartnerSearchResultCard";
import { partnerSearchResultMeta } from "@/lib/agent-r04/partner-search-meta";
import type { PartnerSearchResult } from "@/lib/types";

const base: PartnerSearchResult = {
  id: "p-1", displayName: "Новый агент QA", city: "Казань", photoUrl: null, description: null,
  specializations: [], badges: [], storeCategories: [], branches: [], rating: null, ratingCount: 0,
  partnershipStatus: null, partnerType: "MASTER", partnerTypeLabel: "Специалист",
  workingProductLabels: [], workingServiceLabels: [], workingStageLabels: [],
};

describe("search result public role", () => {
  it("shows a pure agent as agent even when partnerType is MASTER and a stale label says specialist", () => {
    const agent = { ...base, partnerActivities: ["AGENT"], canReceiveCertificates: false };
    expect(searchResultTypeLabel(agent)).toBe("Агент");
    expect(searchResultCoverTone(agent)).toBe("agent");
    expect(partnerSearchResultMeta(agent)[0]).toBe("Агент");
    render(<PartnerSearchResultCard partner={agent} title={agent.displayName} showPublishedTerms={false} inviteDisabled={false} onInvite={() => undefined} />);
    expect(screen.getAllByText("Агент").length).toBeGreaterThan(0);
    expect(screen.queryByText("Специалист")).toBeNull();
  });

  it("does not infer agent from inability to receive: an unconfigured specialist stays a specialist", () => {
    const unconfigured = { ...base, partnerActivities: [], canReceiveCertificates: false };
    expect(searchResultTypeLabel(unconfigured)).toBe("Специалист");
    expect(searchResultCoverTone(unconfigured)).toBe("specialist");
  });

  it("keeps a configured specialist and an agent+service profile as specialist", () => {
    expect(searchResultTypeLabel({ ...base, partnerActivities: ["SERVICE"] })).toBe("Специалист");
    expect(searchResultTypeLabel({ ...base, partnerActivities: ["AGENT", "SERVICE"] })).toBe("Специалист");
  });

  it("falls back to the API label when activities were not sent", () => {
    expect(searchResultTypeLabel({ ...base, partnerType: "COMPANY", partnerTypeLabel: "Компания" })).toBe("Компания");
    expect(searchResultTypeLabel({ ...base, canReceiveCertificates: false })).toBe("Специалист");
  });
});
