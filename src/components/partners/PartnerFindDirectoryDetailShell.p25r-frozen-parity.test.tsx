import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  PARTNER_FIND_DIRECTORY_DETAIL_PUBLISHED_TERMS_DISCLAIMER,
  PartnerFindDirectoryDetailShell,
} from "./PartnerFindDirectoryDetailShell";
import type { PartnerSearchResult } from "@/lib/types";
import * as inlineTerms from "./partnerSearchResultInlineTerms";

vi.mock("./partnerSearchResultInlineTerms", async (importOriginal) => {
  const actual = await importOriginal<typeof inlineTerms>();
  return {
    ...actual,
    readPartnerCertificateProgramForSearchCard: vi.fn(),
  };
});

const readMock = vi.mocked(inlineTerms.readPartnerCertificateProgramForSearchCard);

const partner = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "frozen-demo-light-open",
  displayName: "Студия света",
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

describe("PartnerFindDirectoryDetailShell P25r fold-list geometry", () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it("hides disclaimer while accordion is collapsed", () => {
    readMock.mockResolvedValue({
      status: "loaded",
      items: [{ category: "topic-light", categoryLabel: "Освещение", poolPercent: 10 }],
    });
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    const details = screen.getByTestId("partner-find-directory-detail-general-terms");
    expect(details).not.toHaveAttribute("open");
    expect(screen.getByTestId("partner-find-directory-detail-general-terms-disclaimer")).not.toBeVisible();
  });

  it("focuses summary and shows term row when expanded", async () => {
    readMock.mockResolvedValue({
      status: "loaded",
      items: [{ category: "topic-light", categoryLabel: "Освещение", poolPercent: 10 }],
    });
    const user = userEvent.setup();
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    const details = screen.getByTestId("partner-find-directory-detail-general-terms");
    const summary = details.querySelector("summary");
    expect(summary).toBeTruthy();
    summary!.focus();
    expect(summary).toHaveFocus();
    await user.click(summary!);
    expect(details).toHaveAttribute("open");
    await waitFor(() => {
      expect(screen.getByTestId("partner-find-directory-detail-general-terms-percent")).toHaveTextContent("10%");
    });
    expect(screen.getByText("Освещение")).toBeInTheDocument();
    expect(screen.getByText(/Общий процент:/)).toBeInTheDocument();
  });

  it("closes accordion when summary toggled again", async () => {
    readMock.mockResolvedValue({ status: "empty" });
    const user = userEvent.setup();
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    const summary = screen.getByText("Общие условия для агентов");
    await user.click(summary);
    expect(screen.getByTestId("partner-find-directory-detail-general-terms")).toHaveAttribute("open");
    await user.click(summary);
    expect(screen.getByTestId("partner-find-directory-detail-general-terms")).not.toHaveAttribute("open");
  });

  it("shows badge 0 and empty copy when snapshot is empty", async () => {
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
        agentTermsSnapshot={{ status: "empty" }}
      />,
    );
    expect(readMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("partner-find-directory-detail-general-terms-count")).toHaveTextContent("0");
    await userEvent.click(screen.getByText("Общие условия для агентов"));
    expect(screen.getByTestId("partner-find-directory-detail-general-terms-empty")).toHaveTextContent(
      "Общие условия пока не опубликованы",
    );
  });

  it("does not render accordion when showAgentTerms is false", () => {
    render(
      <PartnerFindDirectoryDetailShell partner={partner()} onBack={() => {}} onInvite={() => {}} />,
    );
    expect(screen.queryByTestId("partner-find-directory-detail-general-terms")).toBeNull();
  });
});

describe("PartnerFindDirectoryDetailShell P25r published disclaimer constant", () => {
  it("exports live disclaimer without demo prefix", () => {
    expect(PARTNER_FIND_DIRECTORY_DETAIL_PUBLISHED_TERMS_DISCLAIMER).toBe(
      "Это общий процент на скидку клиенту и бонус агенту, не гарантированный доход. Итоговые условия партнёр предложит после приглашения.",
    );
    expect(PARTNER_FIND_DIRECTORY_DETAIL_PUBLISHED_TERMS_DISCLAIMER).not.toMatch(/Демоусловия/);
  });
});
