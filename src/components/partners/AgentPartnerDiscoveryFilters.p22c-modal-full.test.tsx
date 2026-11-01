import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import { AgentPartnerDiscoveryFilters } from "./AgentPartnerDiscoveryFilters";

const css = readFileSync(path.join(__dirname, "AgentPartnerDiscoveryFilters.module.css"), "utf8");
const P22C_MARKER = "/* === P22c: modal-full unified refine (frozen directory-filters order) === */";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(),
}));

const { fetchPartnerTaxonomy } = await import("@/lib/partner-taxonomy");

const baseProps = {
  specialization: "",
  stageId: "",
  city: "",
  partnerType: "" as const,
  onSpecializationChange: vi.fn(),
  onStageChange: vi.fn(),
  onCityChange: vi.fn(),
  onPartnerTypeChange: vi.fn(),
};

function fieldLabelsInRefine() {
  const details = screen.getByTestId("agent-partner-discovery-refine");
  const grid = details.querySelector(":scope > div");
  expect(grid).toBeTruthy();
  return Array.from(grid!.querySelectorAll("label > span:first-child")).map((el) => el.textContent);
}

describe("AgentPartnerDiscoveryFilters P22c modal-full contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPartnerTaxonomy).mockResolvedValue({
      products: [{ kind: "product", id: "p1", label: "Плитка" }],
      services: [{ kind: "service", id: "s1", label: "Электромонтаж" }],
      stages: [{ kind: "stage", id: "st1", label: "Черновая" }],
    });
  });

  it("documents P22c CSS appendix for modal-full refine grid and 50px controls", () => {
    const appendix = css.slice(css.indexOf(P22C_MARKER));
    expect(appendix).toMatch(/\.modalFull\s*>\s*\.moreFilters\s*\{[^}]*background:\s*transparent/s);
    expect(appendix).toMatch(/\.modalFullGrid\s*\{[^}]*grid-template-columns:\s*repeat\(2/s);
    expect(appendix).toMatch(
      /\.modalFull\s*>\s*\.moreFilters\s*>\s*\.modalFullGrid\s*>\s*\.field\s*>\s*select[^}]*min-height:\s*50px/s,
    );
  });

  it("renders one refine disclosure with frozen R1 field order inside directory-like grid", async () => {
    render(<AgentPartnerDiscoveryFilters layout="modal-full" {...baseProps} />);

    expect(screen.getByTestId("agent-partner-discovery-refine")).toBeInTheDocument();
    expect(screen.getByText("Город и тип партнёра")).toBeInTheDocument();
    expect(screen.queryByText(/Уточнить:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Область работ, услуг или товаров партнёра")).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("Город и тип партнёра"));
    expect(fieldLabelsInRefine()).toEqual(["Город", "Тип партнёра", "Специализация", "Этап ремонта"]);
  });

  it("uses frozen partner type option order and discovery-partner-type testid", async () => {
    render(<AgentPartnerDiscoveryFilters layout="modal-full" {...baseProps} />);
    await userEvent.click(screen.getByText("Город и тип партнёра"));

    const typeSelect = screen.getByTestId("discovery-partner-type");
    const values = Array.from(typeSelect.querySelectorAll("option")).map((o) => o.getAttribute("value"));
    expect(values).toEqual(["", "store", "company", "specialist", "agent"]);
  });

  it("wires filter handlers for store/company/specialist/agent and spec/stage/city", async () => {
    const handlers = {
      onSpecializationChange: vi.fn(),
      onStageChange: vi.fn(),
      onCityChange: vi.fn(),
      onPartnerTypeChange: vi.fn(),
    };
    render(<AgentPartnerDiscoveryFilters layout="modal-full" {...baseProps} {...handlers} />);
    await userEvent.click(screen.getByText("Город и тип партнёра"));

    await userEvent.type(screen.getByPlaceholderText("Любой"), "С");
    expect(handlers.onCityChange).toHaveBeenCalled();

    for (const type of ["store", "company", "specialist", "agent"] as const) {
      await userEvent.selectOptions(screen.getByTestId("discovery-partner-type"), type);
      expect(handlers.onPartnerTypeChange).toHaveBeenCalledWith(type);
    }

    await waitFor(() => {
      expect(screen.getByTestId("discovery-specialization").querySelector('option[value="services:s1"]')).toBeTruthy();
    });
    await userEvent.selectOptions(screen.getByTestId("discovery-specialization"), "services:s1");
    expect(handlers.onSpecializationChange).toHaveBeenCalledWith("services:s1");

    await userEvent.selectOptions(screen.getByTestId("discovery-stage"), "st1");
    expect(handlers.onStageChange).toHaveBeenCalledWith("st1");
  });

  it("reflects controlled values and opens refine when city or type is set", async () => {
    const { rerender } = render(
      <AgentPartnerDiscoveryFilters layout="modal-full" {...baseProps} city="Казань" partnerType="store" />,
    );
    await waitFor(() => {
      expect(fetchPartnerTaxonomy).toHaveBeenCalled();
    });
    expect(screen.getByText("Город и тип партнёра · выбраны")).toBeInTheDocument();
    expect(screen.getByTestId("agent-partner-discovery-refine")).toHaveAttribute("open");

    rerender(
      <AgentPartnerDiscoveryFilters
        layout="modal-full"
        {...baseProps}
        specialization="products:p1"
        stageId="st1"
        city=""
        partnerType=""
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("discovery-specialization")).toHaveValue("products:p1");
    });
    expect(screen.getByPlaceholderText("Любой")).toHaveValue("");
    expect(screen.getByTestId("discovery-stage")).toHaveValue("st1");
    expect(screen.getByTestId("agent-partner-discovery-refine")).not.toHaveAttribute("open");
  });

  it("shows taxonomy error with retry on modal-full without extra fetch on benign rerender", async () => {
    vi.mocked(fetchPartnerTaxonomy).mockRejectedValueOnce(new RemcardApiError(503, "upstream down"));

    const { rerender } = render(<AgentPartnerDiscoveryFilters layout="modal-full" {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByTestId("agent-partner-discovery-taxonomy-error")).toHaveTextContent(/upstream down/i);
    });
    expect(fetchPartnerTaxonomy).toHaveBeenCalledTimes(1);

    rerender(<AgentPartnerDiscoveryFilters layout="modal-full" {...baseProps} city="x" />);
    expect(fetchPartnerTaxonomy).toHaveBeenCalledTimes(1);

    vi.mocked(fetchPartnerTaxonomy).mockResolvedValueOnce({
      products: [],
      services: [],
      stages: [{ kind: "stage", id: "st1", label: "Черновая" }],
    });
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => {
      expect(fetchPartnerTaxonomy).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByTestId("agent-partner-discovery-taxonomy-error")).not.toBeInTheDocument();
  });

  it("keeps modal-primary and modal-more layouts unchanged", () => {
    const tsx = readFileSync(path.join(__dirname, "AgentPartnerDiscoveryFilters.tsx"), "utf8");
    expect(tsx).toMatch(/layout === "modal-primary"/);
    expect(tsx).toMatch(/layout === "modal-more"/);
    expect(tsx).toContain("Уточнить: город и тип партнёра");
  });
});

export const P23B_HANDOFF_SNIPPET = `
{/* P23b: replace dual mount in agentFindSearchControls with one modal-full block */}
<AgentPartnerDiscoveryFilters
  layout="modal-full"
  specialization={agentDiscoveryFilters.specialization}
  stageId={agentDiscoveryFilters.stageId}
  city={agentDiscoveryFilters.city}
  partnerType={agentDiscoveryFilters.partnerType}
  onSpecializationChange={...}
  onStageChange={...}
  onCityChange={...}
  onPartnerTypeChange={...}
  resetKey={agentDiscoveryResetKey}
/>
`.trim();
