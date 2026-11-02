import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PartnerFindDirectoryDetailShell } from "./PartnerFindDirectoryDetailShell";
import type { PartnerSearchResult } from "@/lib/types";

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
  workingProductLabels: ["Освещение", "Электротовары"],
  workingStageLabels: ["Инженерия", "Оборудование"],
  ...overrides,
});

describe("PartnerFindDirectoryDetailShell P25p", () => {
  it("invokes onBack and onInvite exactly once each; no navigation", async () => {
    const onBack = vi.fn();
    const onInvite = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <PartnerFindDirectoryDetailShell
        partner={partner()}
        onBack={onBack}
        onInvite={onInvite}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("partner-find-directory-detail-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
    await user.click(screen.getByTestId("partner-find-directory-detail-invite"));
    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it("keeps selected public row identity on shell root", () => {
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner({ id: "row-exact-42" })}
        onBack={() => {}}
        onInvite={() => {}}
      />,
    );
    expect(screen.getByTestId("partner-find-directory-detail-shell")).toHaveAttribute(
      "data-partner-id",
      "row-exact-42",
    );
  });

  it("renders DTO directions and transparent empty description without fabricated contacts", () => {
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner({
          description: null,
          workingProductLabels: [],
          workingStageLabels: [],
        })}
        onBack={() => {}}
        onInvite={() => {}}
      />,
    );
    expect(screen.getByTestId("partner-find-directory-detail-topics-empty")).toBeInTheDocument();
    expect(screen.getByTestId("partner-find-directory-detail-description-empty")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows long display name and respects inviteDisabled via partnership status", () => {
    const long =
      "Очень длинное название магазина освещения электротехники и комплектующих для ремонта без обрезания";
    render(
      <PartnerFindDirectoryDetailShell
        partner={partner({
          displayName: long,
          partnershipStatus: "ACTIVE",
        })}
        onBack={() => {}}
        onInvite={() => {}}
      />,
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(long);
    expect(screen.getByTestId("partner-find-directory-detail-invite")).toBeDisabled();
  });
});
