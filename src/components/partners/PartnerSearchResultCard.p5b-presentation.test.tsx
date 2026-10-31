import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  PartnerSearchResultCard,
  searchResultDirectionLabels,
  searchResultTypeLabel,
} from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";

vi.mock("@/components/partners/PartnerGeneralTermsDetails", () => ({
  PartnerGeneralTermsDetails: ({ partnerUserId }: { partnerUserId: string }) => (
    <div data-testid="agent-published-terms">{partnerUserId}</div>
  ),
}));

const cssPath = path.join(__dirname, "PartnerSearchResultCard.module.css");
const css = readFileSync(cssPath, "utf8");

const partner = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "p-1",
  displayName: "Витрина Свет",
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
  workingProductLabels: ["Свет", "Розетки"],
  workingServiceLabels: [],
  workingStageLabels: ["Чистовая отделка"],
  ...overrides,
});

describe("PartnerSearchResultCard P5b presentation", () => {
  it("scopes modalResult* CSS with wrap-safe name/city/chips and ≥44px invite hit", () => {
    expect(css).toContain(".modalResultCard");
    expect(css).toContain(".modalResultName");
    expect(css).toContain(".modalResultCity");
    expect(css).toContain(".modalResultDirections");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toMatch(
      /\.modalResultFoot\s*:global\(button\)\s*\{[^}]*min-height:\s*44px;[^}]*min-width:\s*44px;/s,
    );
    expect(css).toMatch(/@media\s*\(max-width:\s*680px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*360px\)/);
    expect(css).not.toContain("!important");
  });

  it("maps canonical type and real direction labels without inventing chips", () => {
    expect(searchResultTypeLabel(partner())).toBe("Магазин");
    expect(searchResultTypeLabel(partner({ partnerTypeLabel: null, partnerType: "MASTER" }))).toBe(
      "Специалист",
    );
    expect(searchResultDirectionLabels(partner())).toEqual([
      "Свет",
      "Розетки",
      "Чистовая отделка",
    ]);
    expect(
      searchResultDirectionLabels(
        partner({
          workingProductLabels: [],
          workingServiceLabels: [],
          workingStageLabels: [],
          specializations: [],
          storeCategories: [],
          navigatorStageIds: [],
        }),
      ),
    ).toEqual([]);
  });

  it("renders name → type → city → directions hierarchy and invites with the same partner", async () => {
    const onInvite = vi.fn();
    const long = partner({
      displayName:
        "Очень длинное название магазина освещения и электротехники для переноса на 320",
      city: "Краснодарский край, станица Динская, очень длинный адресный хвост",
      workingProductLabels: [
        "Светильники потолочные встраиваемые длинная подпись",
        "Кабель и проводка",
      ],
    });

    render(
      <PartnerSearchResultCard
        partner={long}
        title={long.displayName}
        showPublishedTerms
        inviteDisabled={false}
        onInvite={onInvite}
      />,
    );

    const card = screen.getByTestId("agent-partner-search-result-card");
    expect(card).toHaveAttribute("data-partner-id", "p-1");
    expect(screen.getByTestId("agent-partner-search-result-type")).toHaveTextContent("Магазин");
    expect(screen.getByTestId("agent-partner-search-result-name")).toHaveTextContent(
      long.displayName,
    );
    expect(screen.getByTestId("agent-partner-search-result-city")).toHaveTextContent(long.city!);
    expect(screen.getByTestId("agent-partner-search-result-directions")).toBeInTheDocument();
    expect(screen.getByTestId("agent-published-terms")).toHaveTextContent("p-1");

    await userEvent.click(screen.getByRole("button", { name: "Пригласить" }));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("shows existing partnership status when the contract provides it", () => {
    render(
      <PartnerSearchResultCard
        partner={partner({ partnershipStatus: "ACTIVE" })}
        title="Витрина Свет"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
      />,
    );
    expect(screen.getByText("Активно")).toBeInTheDocument();
  });
});
