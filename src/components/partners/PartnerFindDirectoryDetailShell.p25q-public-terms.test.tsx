import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PartnerFindDirectoryDetailShell } from "./PartnerFindDirectoryDetailShell";
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

describe("PartnerFindDirectoryDetailShell P25q public terms (qt)", () => {
  beforeEach(() => {
    readMock.mockReset();
  });

  it("does not render or fetch terms when showAgentTerms is false (non-AGENT default)", () => {
    render(
      <PartnerFindDirectoryDetailShell partner={partner()} onBack={() => {}} onInvite={() => {}} />,
    );
    expect(screen.queryByTestId("partner-find-directory-detail-general-terms")).toBeNull();
    expect(readMock).not.toHaveBeenCalled();
  });

  it("expands accordion and shows bare percent + disclaimer via shared reader", async () => {
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
    expect(readMock).toHaveBeenCalledWith("frozen-demo-light-open", expect.any(Object));
    const details = screen.getByTestId("partner-find-directory-detail-general-terms");
    expect(details).not.toHaveAttribute("open");
    await user.click(screen.getByText("Общие условия для агентов"));
    expect(details).toHaveAttribute("open");
    await waitFor(() => {
      expect(screen.getByTestId("partner-find-directory-detail-general-terms-percent")).toHaveTextContent(
        "10%",
      );
    });
    expect(screen.getByTestId("partner-find-directory-detail-general-terms-disclaimer")).toHaveTextContent(
      "скидку клиенту и бонус агенту",
    );
    expect(screen.getByTestId("partner-find-directory-detail-general-terms-disclaimer")).not.toHaveTextContent(
      "Демоусловия",
    );
    expect(screen.getByTestId("partner-find-directory-detail-general-terms-count")).toHaveTextContent("1");
  });

  it("uses agentTermsSnapshot without calling reader", async () => {
    readMock.mockResolvedValue({ status: "empty" });
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
        agentTermsSnapshot={{
          status: "loaded",
          items: [{ category: "z", categoryLabel: "Двери", poolPercent: 0 }],
        }}
      />,
    );
    expect(readMock).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText("Общие условия для агентов"));
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("shows Нет данных when pool percent is not a finite number", async () => {
    readMock.mockResolvedValue({
      status: "loaded",
      items: [{ category: "x", categoryLabel: "Свет", poolPercent: Number.NaN }],
    });
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    await userEvent.click(screen.getByText("Общие условия для агентов"));
    await waitFor(() => expect(screen.getByText("Нет данных")).toBeInTheDocument());
  });

  it("retries after error state from shared reader", async () => {
    readMock.mockResolvedValueOnce({ status: "error", message: "Ошибка 500" });
    readMock.mockResolvedValueOnce({ status: "empty" });
    const user = userEvent.setup();
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={() => {}}
        onInvite={() => {}}
        showAgentTerms
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("partner-find-directory-detail-general-terms-error")).toHaveTextContent(
        "Ошибка 500",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(readMock).toHaveBeenCalledTimes(2);
  });
});
