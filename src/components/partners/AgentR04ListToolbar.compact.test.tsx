/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentR04ListToolbar } from "./AgentR04ListToolbar";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [{ kind: "service", id: "paint", label: "Покраска" }],
    stages: [{ kind: "stage", id: "L1-1", label: "Демонтаж" }],
  }),
}));

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
  sort: "updated_desc" as const,
  onPartnerTypeChange: vi.fn(),
  onSpecializationChange: vi.fn(),
  onStageChange: vi.fn(),
  onCityChange: vi.fn(),
  onSortChange: vi.fn(),
  onResetFilters: vi.fn(),
  taxonomyResetKey: 0,
  chips: [],
};

describe("AgentR04ListToolbar compact row", () => {
  it("renders one compact row: search, Filters, subtle list/cards", async () => {
    const user = userEvent.setup();
    render(<AgentR04ListToolbar {...baseProps} />);
    expect(screen.getByTestId("partners-compact-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("agent-r04-list-search")).toBeInTheDocument();
    expect(screen.getByTestId("partners-filters-details")).toBeInTheDocument();
    expect(screen.getByTestId("agent-r04-view-toggle")).toBeInTheDocument();

    await user.click(screen.getByText("Фильтры"));
    expect(screen.getByTestId("list-archive-view")).toBeInTheDocument();
    expect(screen.getByTestId("list-sort")).toBeInTheDocument();
    expect(screen.getByTestId("active-partner-type")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Карточки"));
    expect(baseProps.onViewModeChange).toHaveBeenCalledWith("cards");
  });
});
