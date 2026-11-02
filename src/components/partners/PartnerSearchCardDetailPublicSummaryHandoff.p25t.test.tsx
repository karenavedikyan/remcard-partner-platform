import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useCallback, useRef, useState } from "react";
import type { PartnerCertProgramState } from "@/lib/partner-certificate-program";
import type { PartnerSearchResult } from "@/lib/types";
import { PartnerFindDirectoryDetailShell } from "./PartnerFindDirectoryDetailShell";
import { PartnerSearchResultCard } from "./PartnerSearchResultCard";
import {
  agentTermsSnapshotForDetailHandoff,
  publicSummaryComparableFields,
  publicSummaryFieldsMatchCardAndDetail,
  showAgentTermsForFindDetailHandoff,
} from "./partnerSearchPublicSummaryHandoff";
import * as inlineTerms from "./partnerSearchResultInlineTerms";

vi.mock("./partnerSearchResultInlineTerms", async (importOriginal) => {
  const actual = await importOriginal<typeof inlineTerms>();
  return {
    ...actual,
    readPartnerCertificateProgramForSearchCard: vi.fn(),
  };
});

const readMock = vi.mocked(inlineTerms.readPartnerCertificateProgramForSearchCard);

const partner = (id: string, name: string): PartnerSearchResult => ({
  id,
  displayName: name,
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
  partnerType: "STORE",
  partnerTypeLabel: "Магазин",
  isPublic: true,
});

function FindDetailHandoffHarness({
  showAgentPublishedTerms,
  initialDetailPartner = null as PartnerSearchResult | null,
}: {
  showAgentPublishedTerms: boolean;
  initialDetailPartner?: PartnerSearchResult | null;
}) {
  const [detailPartner, setDetailPartner] = useState<PartnerSearchResult | null>(initialDetailPartner);
  const summaryByPartner = useRef(new Map<string, PartnerCertProgramState>());

  const onPublicSummaryStateChange = useCallback((partnerUserId: string, state: PartnerCertProgramState) => {
    summaryByPartner.current.set(partnerUserId, state);
  }, []);

  const showAgentTerms = showAgentTermsForFindDetailHandoff(showAgentPublishedTerms);
  const snapshot = detailPartner
    ? agentTermsSnapshotForDetailHandoff(detailPartner.id, summaryByPartner.current)
    : undefined;

  return (
    <div>
      <PartnerSearchResultCard
        partner={partner("row-a", "Студия A")}
        title="Студия A"
        showPublishedTerms={showAgentPublishedTerms}
        inviteDisabled={false}
        onInvite={() => {}}
        onDetail={() => setDetailPartner(partner("row-a", "Студия A"))}
        onPublicSummaryStateChange={onPublicSummaryStateChange}
      />
      {detailPartner ? (
        <PartnerFindDirectoryDetailShell
          partner={detailPartner}
          onBack={() => setDetailPartner(null)}
          onInvite={() => {}}
          showAgentTerms={showAgentTerms}
          agentTermsSnapshot={snapshot}
        />
      ) : null}
    </div>
  );
}

describe("P25t SearchCard → detail public summary handoff (parent shim)", () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it("AGENT: loaded card summary opens detail without second upstream read when snapshot handed off", async () => {
    readMock.mockResolvedValue({
      status: "loaded",
      items: [{ category: "topic-light", categoryLabel: "Освещение", poolPercent: 10 }],
    });
    const user = userEvent.setup();
    render(<FindDetailHandoffHarness showAgentPublishedTerms />);
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-percent-headline")).toHaveTextContent("10%"),
    );
    expect(readMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Подробнее" }));
    await user.click(screen.getByText("Общие условия для агентов"));
    await waitFor(() =>
      expect(screen.getByTestId("partner-find-directory-detail-general-terms-percent")).toHaveTextContent("10%"),
    );
    expect(readMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("partner-find-directory-detail-general-terms-disclaimer")).not.toHaveTextContent(
      "Демоусловия",
    );
  });

  it("non-AGENT: card and detail do not fetch or render agent terms", async () => {
    render(<FindDetailHandoffHarness showAgentPublishedTerms={false} initialDetailPartner={partner("row-a", "A")} />);
    expect(screen.queryByTestId("agent-partner-search-result-terms-panel")).toBeNull();
    expect(screen.queryByTestId("partner-find-directory-detail-general-terms")).toBeNull();
    expect(readMock).not.toHaveBeenCalled();
  });

  it("card and detail expose matching public summary fields for same entity", async () => {
    const loaded: PartnerCertProgramState = {
      status: "loaded",
      items: [{ category: "d", categoryLabel: "Двери", poolPercent: 0 }],
    };
    readMock.mockResolvedValue(loaded);
    const user = userEvent.setup();
    render(<FindDetailHandoffHarness showAgentPublishedTerms />);
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-percent")).toHaveTextContent("0%"),
    );
    await user.click(screen.getByRole("button", { name: "Подробнее" }));
    await user.click(screen.getByText("Общие условия для агентов"));
    const cardFields = publicSummaryComparableFields("row-a", loaded);
    const detailFields = publicSummaryComparableFields("row-a", loaded);
    expect(publicSummaryFieldsMatchCardAndDetail(cardFields, detailFields)).toBe(true);
  });

  it("error on card still allows detail retry path without treating error as snapshot handoff", async () => {
    readMock
      .mockResolvedValueOnce({ status: "error", message: "502" })
      .mockResolvedValueOnce({ status: "empty" });
    const user = userEvent.setup();
    render(<FindDetailHandoffHarness showAgentPublishedTerms />);
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-error")).toHaveTextContent("502"),
    );
    await user.click(screen.getByRole("button", { name: "Подробнее" }));
    await user.click(screen.getByText("Общие условия для агентов"));
    await waitFor(() =>
      expect(screen.getByTestId("partner-find-directory-detail-general-terms-empty")).toBeInTheDocument(),
    );
    expect(readMock).toHaveBeenCalledTimes(2);
  });
});
