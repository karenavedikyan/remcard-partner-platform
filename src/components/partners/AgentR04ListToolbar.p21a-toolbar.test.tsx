/** @vitest-environment jsdom */
/**
 * P21a active quiet-toolbar presentation (additive).
 * Asserts R1-aligned list/cards labels, reset under count, and quiet tools row —
 * no offset-slab chrome. Does not touch invitations variant.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentR04ListToolbar } from "@/components/partners/AgentR04ListToolbar";

const baseProps = {
  count: 2,
  searchQuery: "",
  onSearchQueryChange: vi.fn(),
  viewMode: "list" as const,
  onViewModeChange: vi.fn(),
  archiveView: "active" as const,
  onArchiveViewChange: vi.fn(),
  partnerType: "" as const,
  specialization: "",
  stageId: "",
  city: "",
  sort: "name" as const,
  onPartnerTypeChange: vi.fn(),
  onSpecializationChange: vi.fn(),
  onStageChange: vi.fn(),
  onCityChange: vi.fn(),
  onSortChange: vi.fn(),
  onResetFilters: vi.fn(),
  taxonomyResetKey: 0,
  chips: [] as { key: string; label: string; onClear: () => void }[],
};

describe("AgentR04ListToolbar P21a quiet toolbar", () => {
  it("renders R1 list/cards text labels with Вид списка group label", () => {
    render(<AgentR04ListToolbar {...baseProps} />);
    const toggle = screen.getByTestId("agent-r04-view-toggle");
    expect(toggle).toHaveAttribute("aria-label", "Вид списка");
    expect(within(toggle).getByRole("button", { name: "Список" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(toggle).getByRole("button", { name: "Карточки" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(within(toggle).getByRole("button", { name: "Список" })).toHaveTextContent("Список");
    expect(within(toggle).getByRole("button", { name: "Карточки" })).toHaveTextContent(
      "Карточки",
    );
  });

  it("keeps reset under collection count and preserves search/view callbacks", async () => {
    const user = userEvent.setup();
    const onSearchQueryChange = vi.fn();
    const onViewModeChange = vi.fn();
    const onResetFilters = vi.fn();
    render(
      <AgentR04ListToolbar
        {...baseProps}
        searchQuery="агент"
        partnerType="agent"
        onSearchQueryChange={onSearchQueryChange}
        onViewModeChange={onViewModeChange}
        onResetFilters={onResetFilters}
      />,
    );

    const root = screen.getByTestId("agent-r04-list-toolbar");
    const count = root.querySelector("[class*='collectionCount']");
    expect(count).toBeTruthy();
    const reset = within(count as HTMLElement).getByRole("button", {
      name: "Сбросить фильтры",
    });
    expect(reset).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Карточки" }));
    expect(onViewModeChange).toHaveBeenCalledWith("cards");

    await user.clear(screen.getByTestId("agent-r04-list-search"));
    await user.type(screen.getByTestId("agent-r04-list-search"), "x");
    expect(onSearchQueryChange).toHaveBeenCalled();

    await user.click(reset);
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it("does not render view toggle in invitations listMode", () => {
    render(<AgentR04ListToolbar {...baseProps} listMode="invitations" />);
    expect(screen.queryByTestId("agent-r04-view-toggle")).toBeNull();
    expect(screen.queryByTestId("partners-filters-details")).toBeNull();
    expect(screen.getByTestId("partners-compact-toolbar")).toBeInTheDocument();
  });
});
