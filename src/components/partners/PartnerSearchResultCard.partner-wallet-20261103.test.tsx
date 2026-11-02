import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PartnerSearchResult } from "@/lib/types";
import {
  PartnerSearchResultCard,
  findDirectoryDetailInviteLabel,
  searchResultAllStageLabels,
  searchResultCardPrimaryDirectionLabels,
  searchResultCardStagesLine,
  searchResultDetailStagesLine,
  searchResultDetailTopicsLine,
  searchResultDirectionGroups,
} from "./PartnerSearchResultCard";
import { PartnerFindDirectoryDetailShell } from "./PartnerFindDirectoryDetailShell";

vi.mock("@/components/partners/PartnerSearchResultInlineTerms", () => ({
  PartnerSearchResultInlineTerms: () => <div data-testid="agent-inline-terms" />,
}));

vi.mock("@/lib/auth-config", () => ({
  getLegalSiteUrl: () => "https://remcard.ru",
}));

const cardCss = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");
const detailCss = readFileSync(path.join(__dirname, "PartnerFindDirectoryDetailShell.module.css"), "utf8");

const base = (overrides: Partial<PartnerSearchResult> = {}): PartnerSearchResult => ({
  id: "p-card",
  displayName: "Demo",
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
  workingProductLabels: ["Плитка", "Двери", "Свет"],
  workingServiceLabels: ["Ремонт"],
  workingStageLabels: ["S1", "S2", "S3", "S4"],
  ...overrides,
});

describe("partner-wallet-20261103 ordering isolation", () => {
  it("keeps shared searchResultDirectionGroups on products→services cap-4 for legacy callers", () => {
    const partner = base();
    const { primary } = searchResultDirectionGroups(partner);
    expect(primary[0]).toBe("Плитка");
    expect(primary).toHaveLength(4);
    expect(searchResultCardPrimaryDirectionLabels(partner)).toEqual(["Ремонт", "Плитка", "Двери"]);
  });

  it("caps card primary directions at three labels", () => {
    expect(searchResultCardPrimaryDirectionLabels(base())).toEqual(["Ремонт", "Плитка", "Двери"]);
  });

  it("uses service-first comma topics on detail without mutating shared groups", () => {
    expect(searchResultDetailTopicsLine(base())).toBe("Ремонт, Плитка, Двери, Свет");
  });
});

describe("partner-wallet-20261103 card footer and stages", () => {
  it("truncates card stages but reports truthful overflow count", () => {
    expect(searchResultCardStagesLine(base())).toBe("S1 · S2 · S3 и ещё 1");
    expect(searchResultAllStageLabels(base())).toHaveLength(4);
  });

  it("lists every stage on detail without card truncation", () => {
    render(<PartnerFindDirectoryDetailShell partner={base()} onBack={() => {}} onInvite={() => {}} />);
    expect(screen.getByTestId("partner-find-directory-detail-stages")).toHaveTextContent(
      "Этапы: S1, S2, S3, S4",
    );
    expect(searchResultDetailStagesLine(base())).toBe("S1, S2, S3, S4");
  });

  it.each([
    ["ACTIVE", "Активно"],
    ["PENDING", "Согласование"],
  ] as const)("shows Подробнее + status for %s without enabled invite", async (status, label) => {
    const onDetail = vi.fn();
    render(
      <PartnerSearchResultCard
        partner={base({ partnershipStatus: status })}
        title="Студия"
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => {}}
        onDetail={onDetail}
      />,
    );
    const foot = screen.getByTestId("agent-partner-search-result-foot");
    expect(within(foot).getByTestId("agent-partner-search-result-detail")).toBeInTheDocument();
    expect(within(foot).getByText(label)).toBeInTheDocument();
    expect(screen.queryByTestId("agent-partner-search-result-invite")).toBeNull();
    await userEvent.click(screen.getByTestId("agent-partner-search-result-detail"));
    expect(onDetail).toHaveBeenCalledTimes(1);
  });
});

describe("partner-wallet-20261103 detail shell behavior", () => {
  it.each([
    ["STORE", "Магазин"],
    ["COMPANY", "Компания"],
    ["MASTER", "Специалист"],
    ["AGENT", "Агент"],
  ] as const)("renders ACTIVE detail for %s without terms accordion or enabled invite", (partnerType, label) => {
    render(
      <PartnerFindDirectoryDetailShell
        partner={base({ partnerType, partnerTypeLabel: label, partnershipStatus: "ACTIVE" })}
        onBack={() => {}}
        onInvite={() => {}}
      />,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
    const statusRow = screen.getByTestId("partner-find-directory-detail-status");
    expect(within(statusRow).getByText("Активно")).toBeInTheDocument();
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toBeDisabled();
    expect(screen.queryByTestId("partner-find-directory-detail-general-terms")).toBeNull();
  });

  it("shows busy copy on detail invite when inviteBusy", () => {
    render(
      <PartnerFindDirectoryDetailShell
        partner={base()}
        onBack={() => {}}
        onInvite={() => {}}
        inviteBusy
      />,
    );
    expect(findDirectoryDetailInviteLabel(base(), { inviteBusy: true })).toBe("Отправка…");
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toHaveTextContent("Отправка…");
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toBeDisabled();
  });

  it("orders mobile footer invite before back in DOM with full-width rules", () => {
    expect(detailCss).toMatch(/@media \(max-width: 680px\)[^]*\.footInvite[^]*order:\s*1/s);
    expect(detailCss).toMatch(/@media \(max-width: 680px\)[^]*\.footBack[^]*order:\s*2/s);
    expect(detailCss).toMatch(/@media \(max-width: 680px\)[^]*width:\s*100%/s);

    render(<PartnerFindDirectoryDetailShell partner={base()} onBack={() => {}} onInvite={() => {}} />);
    const foot = screen.getByTestId("partner-find-directory-detail-invite").closest("footer")!;
    const buttons = within(foot as HTMLElement).getAllByRole("button");
    expect(buttons[0]).toHaveAttribute("data-testid", "partner-find-directory-detail-invite");
    expect(buttons[1]).toHaveAttribute("data-testid", "partner-find-directory-detail-back");
  });

  it("survives long display name and long stage list in detail", () => {
    const longName =
      "Очень длинное название магазина освещения электротехники и комплектующих для ремонта без обрезания";
    const stages = ["Этап А", "Этап Б", "Этап В", "Этап Г", "Этап Д"];
    render(
      <PartnerFindDirectoryDetailShell
        partner={base({
          displayName: longName,
          workingStageLabels: stages,
          partnershipStatus: "PENDING",
        })}
        onBack={() => {}}
        onInvite={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(longName);
    expect(screen.getByTestId("partner-find-directory-detail-stages")).toHaveTextContent(stages.join(", "));
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toBeDisabled();
  });
});

describe("partner-wallet-20261103 inline terms geometry (component CSS, not prototype substitute)", () => {
  it("documents stacked 27px headline in real module CSS", () => {
    expect(cardCss).toMatch(/\.modalResultInlineTermsHead\s*\{[^}]*display:\s*grid;/s);
    expect(cardCss).toMatch(/\.modalResultInlineTermsRange strong\s*\{[^}]*font-size:\s*27px;/s);
  });
});
