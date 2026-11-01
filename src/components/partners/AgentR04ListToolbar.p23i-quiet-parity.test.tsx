/** @vitest-environment jsdom */
/**
 * P23i: quiet-tools order/spacing — chips before count; no always-on selection prose.
 * Selection/actions remain in AgentPartnerBulkBar (Hub), not removed.
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentR04ListToolbar } from "@/components/partners/AgentR04ListToolbar";

const baseProps = {
  count: 3,
  searchQuery: "",
  onSearchQueryChange: vi.fn(),
  viewMode: "list" as const,
  onViewModeChange: vi.fn(),
  archiveView: "active" as const,
  onArchiveViewChange: vi.fn(),
  partnerType: "store" as const,
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
  chips: [{ key: "partnerType", label: "Тип: Магазин", onClear: vi.fn() }],
};

describe("AgentR04ListToolbar P23i quiet-tools parity", () => {
  it("orders tools → chips → count like frozen quiet-tools", () => {
    render(<AgentR04ListToolbar {...baseProps} />);
    const root = screen.getByTestId("agent-r04-list-toolbar");
    const children = [...root.children].map((el) => el.getAttribute("data-testid") || el.className);
    const toolsIdx = children.findIndex((c) => String(c).includes("partners-compact-toolbar"));
    const chipsIdx = children.findIndex((c) => String(c).includes("list-filter-chips"));
    const countIdx = children.findIndex((c) => String(c).includes("agent-r04-collection-count"));
    expect(toolsIdx).toBeGreaterThanOrEqual(0);
    expect(chipsIdx).toBeGreaterThan(toolsIdx);
    expect(countIdx).toBeGreaterThan(chipsIdx);
  });

  it("keeps search / filters / view grouping and does not show selection prose in count", async () => {
    const user = userEvent.setup();
    const onViewModeChange = vi.fn();
    render(<AgentR04ListToolbar {...baseProps} onViewModeChange={onViewModeChange} />);

    expect(screen.getByTestId("agent-r04-list-search")).toBeInTheDocument();
    expect(screen.getByTestId("partners-filters-details")).toBeInTheDocument();
    const toggle = screen.getByTestId("agent-r04-view-toggle");
    expect(within(toggle).getByRole("button", { name: "Список" })).toBeInTheDocument();
    expect(within(toggle).getByRole("button", { name: "Карточки" })).toBeInTheDocument();

    expect(screen.queryByText(/Выделите записи/i)).toBeNull();
    expect(screen.getByTestId("agent-r04-collection-count")).toHaveTextContent("Найдено: 3");

    await user.click(within(toggle).getByRole("button", { name: "Карточки" }));
    expect(onViewModeChange).toHaveBeenCalledWith("cards");
  });
});
