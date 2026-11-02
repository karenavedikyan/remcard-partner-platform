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
  id: "live-partner-1",
  displayName: "ООО Реальный партнёр",
  city: "Москва",
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

async function openTermsAccordion() {
  await userEvent.click(screen.getByText("Общие условия для агентов"));
}

function disclaimerEl() {
  return screen.getByTestId("partner-find-directory-detail-general-terms-disclaimer");
}

describe("PartnerFindDirectoryDetailShell P25s live terms truthful copy", () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it("never labels published reader disclaimer as demo (loaded API data)", async () => {
    readMock.mockResolvedValue({
      status: "loaded",
      items: [{ category: "doors", categoryLabel: "Двери", poolPercent: 12 }],
    });
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    await openTermsAccordion();
    await waitFor(() => expect(disclaimerEl()).toHaveTextContent(PARTNER_FIND_DIRECTORY_DETAIL_PUBLISHED_TERMS_DISCLAIMER));
    expect(disclaimerEl()).not.toHaveTextContent("Демоусловия");
  });

  it("shows same truthful disclaimer on empty published program", async () => {
    readMock.mockResolvedValue({ status: "empty" });
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    await openTermsAccordion();
    await waitFor(() =>
      expect(screen.getByTestId("partner-find-directory-detail-general-terms-empty")).toBeInTheDocument(),
    );
    expect(disclaimerEl()).toHaveTextContent(PARTNER_FIND_DIRECTORY_DETAIL_PUBLISHED_TERMS_DISCLAIMER);
    expect(disclaimerEl()).not.toHaveTextContent("Демоусловия");
  });

  it("shows truthful disclaimer after error (no demo label on retry path)", async () => {
    readMock.mockResolvedValueOnce({ status: "error", message: "Сеть недоступна" });
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    await openTermsAccordion();
    await waitFor(() =>
      expect(screen.getByTestId("partner-find-directory-detail-general-terms-error")).toHaveTextContent(
        "Сеть недоступна",
      ),
    );
    expect(disclaimerEl()).not.toHaveTextContent("Демоусловия");
  });

  it("shows 0% from reader without demo label (snapshot)", async () => {
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
        agentTermsSnapshot={{
          status: "loaded",
          items: [{ category: "z", categoryLabel: "Свет", poolPercent: 0 }],
        }}
      />,
    );
    await openTermsAccordion();
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(disclaimerEl()).not.toHaveTextContent("Демоусловия");
  });

  it("keeps truncated-category footnote when reader marks truncated", async () => {
    readMock.mockResolvedValue({
      status: "loaded",
      truncated: true,
      items: [{ category: "a", categoryLabel: "A", poolPercent: 5 }],
    });
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    await openTermsAccordion();
    expect(screen.getByText(/Показаны первые категории/)).toBeInTheDocument();
    expect(disclaimerEl()).not.toHaveTextContent("Демоусловия");
  });
});
