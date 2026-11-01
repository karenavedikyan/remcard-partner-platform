import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PartnerSearchResultInlineTerms } from "./PartnerSearchResultInlineTerms";
import {
  formatPartnerSearchInlineTermLine,
  partnerSearchInlinePercentHeadline,
  resetPartnerSearchInlineTermsCache,
} from "./partnerSearchResultInlineTerms";
import {
  PartnerSearchResultCard,
  searchResultFootPresentation,
  searchResultInviteFoot,
} from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";

vi.mock("./partnerSearchResultInlineTerms", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./partnerSearchResultInlineTerms")>();
  return {
    ...actual,
    readPartnerCertificateProgramForSearchCard: vi.fn(),
  };
});

import { readPartnerCertificateProgramForSearchCard } from "./partnerSearchResultInlineTerms";

const openPartner = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "p-open",
  displayName: "Open",
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
  ...overrides,
});

describe("P25l frozen-exact inline list percent (bare 0%, unavailable missing)", () => {
  beforeEach(() => {
    resetPartnerSearchInlineTermsCache();
    vi.mocked(readPartnerCertificateProgramForSearchCard).mockReset();
  });

  it("renders bare 0% in list without accordion footnote (frozen pr-terms)", () => {
    const line = formatPartnerSearchInlineTermLine({
      category: "doors",
      categoryLabel: "Двери",
      poolPercent: 0,
    });
    expect(line.percentText).toBe("0%");
    expect(partnerSearchInlinePercentHeadline([{ category: "d", categoryLabel: "D", poolPercent: 0 }])).toBe(
      "0%",
    );
  });

  it("shows Нет данных for non-finite pool without inventing 0%", async () => {
    vi.mocked(readPartnerCertificateProgramForSearchCard).mockResolvedValue({
      status: "loaded",
      items: [
        { category: "a", categoryLabel: "Категория с длинным названием для переноса", poolPercent: 0 },
        { category: "b", categoryLabel: "Без опубликованного процента", poolPercent: Number.NaN },
      ],
    });
    render(<PartnerSearchResultInlineTerms partnerUserId="p25k-terms" />);
    await waitFor(() =>
      expect(screen.getByTestId("agent-partner-search-result-terms-summary")).toBeInTheDocument(),
    );
    const percents = screen.getAllByTestId("agent-partner-search-result-terms-percent");
    expect(percents).toHaveLength(1);
    expect(percents[0]).toHaveTextContent("0%");
    expect(percents[0].textContent).not.toContain("участие");
    expect(screen.getByTestId("agent-partner-search-result-terms-percent-unavailable")).toHaveTextContent(
      "Нет данных",
    );
  });
});

describe("P25l four partner types × relationship foot actions (agent viewer, search DTO gates)", () => {
  const matrix = [
    {
      key: "store-open",
      partner: openPartner({ partnerType: "STORE", partnerTypeLabel: "Магазин" }),
      mode: "invite-button" as const,
      inviteLabel: "Сотрудничать",
      enabled: true,
      statusText: null,
    },
    {
      key: "company-active",
      partner: openPartner({
        partnerType: "COMPANY",
        partnerTypeLabel: "Компания",
        partnershipStatus: "ACTIVE",
      }),
      mode: "status-badge" as const,
      inviteLabel: null,
      enabled: false,
      statusText: "Активно",
    },
    {
      key: "specialist-pending",
      partner: openPartner({
        partnerType: "MASTER",
        partnerTypeLabel: "Специалист",
        partnershipStatus: "PENDING",
      }),
      mode: "status-badge" as const,
      inviteLabel: null,
      enabled: false,
      statusText: "Согласование",
    },
    {
      key: "agent-invited",
      partner: openPartner({
        partnerType: "AGENT",
        partnerTypeLabel: "Агент",
        partnershipStatus: "INVITED",
      }),
      mode: "status-badge" as const,
      inviteLabel: null,
      enabled: false,
      statusText: "Приглашение",
    },
  ];

  it.each(matrix)("$key foot presentation matches frozen eligibility slot", (row) => {
    const foot = searchResultFootPresentation(row.partner);
    expect(foot.mode).toBe(row.mode);
    if (row.mode === "status-badge") {
      expect(foot.statusLabel).toBe(row.statusText);
      expect(foot.invite).toBeNull();
    } else {
      expect(foot.invite?.label).toBe(row.inviteLabel);
      expect(foot.invite?.disabled).toBe(!row.enabled);
    }
  });

  it.each(matrix)("renders foot controls for $key without inventing extra chrome", async (row) => {
    const onInvite = vi.fn();
    render(
      <PartnerSearchResultCard
        partner={row.partner}
        title={row.partner.displayName ?? "T"}
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={onInvite}
      />,
    );
    const foot = screen.getByTestId("agent-partner-search-result-foot");
    if (row.mode === "status-badge") {
      expect(within(foot).getByText(row.statusText!)).toBeInTheDocument();
      expect(screen.queryByTestId("agent-partner-search-result-invite")).toBeNull();
      expect(onInvite).not.toHaveBeenCalled();
      return;
    }
    const btn = screen.getByTestId("agent-partner-search-result-invite");
    expect(btn).toHaveTextContent("Сотрудничать");
    await userEvent.click(btn);
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("applies hub inviteDisabled and inviteBusy gates only on open rows", () => {
    const open = openPartner();
    expect(searchResultInviteFoot(open, { inviteDisabled: true }).disabled).toBe(true);
    expect(searchResultInviteFoot(open, { inviteDisabled: true }).label).toBe("Сотрудничать");
    expect(searchResultInviteFoot(open, { inviteBusy: true }).label).toBe("Отправка…");
    expect(searchResultFootPresentation(openPartner({ partnershipStatus: "ACTIVE" })).mode).toBe(
      "status-badge",
    );
  });
});
