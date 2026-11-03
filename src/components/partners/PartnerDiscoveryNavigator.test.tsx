import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerDiscoveryNavigator } from "./PartnerDiscoveryNavigator";
import { installPartnerDirectoryDomMocks } from "./test/installPartnerDirectoryDomMocks";

const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/partner-taxonomy", () => ({ fetchPartnerTaxonomy: load }));
const facets = { total: 25, baseTotal: 25, stageTotal: 25, products: { doors: 23, tiles: 2 }, services: {}, stages: { "L1-9": 23 } };
describe("prototype discovery navigator backed by complete query aggregates", () => {
  let restoreDom: (() => void) | undefined;

  beforeEach(() => {
    restoreDom = installPartnerDirectoryDomMocks();
    load.mockResolvedValue({
      stages: [{ kind: "stage", id: "L1-9", label: "Чистовая отделка" }, { kind: "stage", id: "L1-1", label: "Диагностика" }],
      products: [{ kind: "product", id: "doors", label: "Двери" }, { kind: "product", id: "tiles", label: "Плитка" }],
      services: [],
    });
  });

  afterEach(() => {
    restoreDom?.();
  });

  it("starts collapsed when viewport is below 761px", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    render(
      <PartnerDiscoveryNavigator
        stageId=""
        specialization=""
        facets={facets}
        loading={false}
        onStageChange={vi.fn()}
        onSpecializationChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("partner-discovery-navigator")).not.toHaveAttribute("open");
    expect(screen.getByText("Все этапы")).toBeInTheDocument();
  });

  it("uses real counts, resets direction when selecting a stage and exposes unavailable stages", async () => {
    const stage = vi.fn(), direction = vi.fn();
    render(<PartnerDiscoveryNavigator stageId="" specialization="" facets={facets} loading={false} onStageChange={stage} onSpecializationChange={direction} />);
    const button = await screen.findByRole("button", { name: /Чистовая отделка/ });
    expect(button).toHaveTextContent("23");
    expect(screen.getByRole("button", { name: /Диагностика/ })).toBeDisabled();
    fireEvent.click(button);
    expect(direction).toHaveBeenCalledWith("");
    expect(stage).toHaveBeenCalledWith("L1-9");
    fireEvent.click(screen.getByRole("button", { name: /Двери/ }));
    expect(direction).toHaveBeenCalledWith("products:doors");
    expect(screen.getByRole("button", { name: /Весь путь/ })).toHaveTextContent("25");
  });
  it("does not fabricate zero availability while a query is loading", async () => {
    render(<PartnerDiscoveryNavigator stageId="" specialization="" facets={null} loading onStageChange={vi.fn()} onSpecializationChange={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Диагностика/ })).toBeEnabled());
    expect(screen.getByRole("button", { name: /Диагностика/ })).toHaveTextContent("…");
  });
});
