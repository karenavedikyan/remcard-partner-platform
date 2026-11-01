import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import { AgentPartnerDiscoveryFilters } from "./AgentPartnerDiscoveryFilters";

const css = readFileSync(path.join(__dirname, "AgentPartnerDiscoveryFilters.module.css"), "utf8");
const P22A_MARKER = "/* === P22a: modal-more disclosure vs frozen pr-showcase-refine === */";

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

describe("AgentPartnerDiscoveryFilters P22a modal find filters", () => {
  beforeEach(() => {
    vi.mocked(fetchPartnerTaxonomy).mockResolvedValue({
      products: [{ kind: "product", id: "p1", label: "Плитка" }],
      services: [{ kind: "service", id: "s1", label: "Электромонтаж" }],
      stages: [{ kind: "stage", id: "st1", label: "Черновая" }],
    });
  });

  it("documents PartnerSearchFilters is not wired into agent modal find controls", () => {
    const hub = readFileSync(path.join(__dirname, "PartnersHub.tsx"), "utf8");
    const block = hub.slice(hub.indexOf("const agentFindSearchControls"), hub.indexOf("const agentFindResultsBlock"));
    expect(block).toContain('layout="modal-primary"');
    expect(block).toContain('layout="modal-more"');
    expect(block).not.toContain("PartnerSearchFilters");
  });

  it("aligns modal-more disclosure chrome with frozen pr-showcase-refine contract", () => {
    const appendix = css.slice(css.indexOf(P22A_MARKER));
    expect(appendix).toMatch(/\.modalMore\s*>\s*\.moreFilters\s*\{[^}]*min-height:\s*48px/s);
    expect(appendix).toMatch(/\.modalMore\s*>\s*\.moreFilters\s*\{[^}]*background:\s*transparent/s);
    expect(appendix).toMatch(
      /\.modalMore\s*>\s*\.moreFilters\s*>\s*summary\s*\{[^}]*font-size:\s*0\.75rem;[^}]*font-weight:\s*500/s,
    );
    expect(appendix).toMatch(/min-height:\s*48px/s);
  });

  it("shows taxonomy error with local retry without autosend", async () => {
    vi.mocked(fetchPartnerTaxonomy)
      .mockRejectedValueOnce(new RemcardApiError(503, "upstream down"))
      .mockResolvedValueOnce({
        products: [],
        services: [],
        stages: [{ kind: "stage", id: "st1", label: "Черновая" }],
      });

    render(<AgentPartnerDiscoveryFilters layout="modal-primary" {...baseProps} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/upstream down/i);
    });
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
    expect(fetchPartnerTaxonomy).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => {
      expect(fetchPartnerTaxonomy).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps modal-more city/type disclosure and handlers", async () => {
    const onCityChange = vi.fn();
    const onPartnerTypeChange = vi.fn();
    render(
      <AgentPartnerDiscoveryFilters
        layout="modal-more"
        {...baseProps}
        onCityChange={onCityChange}
        onPartnerTypeChange={onPartnerTypeChange}
      />,
    );

    const details = screen.getByText("Уточнить: город и тип партнёра").closest("details");
    expect(details).toBeTruthy();
    await userEvent.click(screen.getByText("Уточнить: город и тип партнёра"));

    const cityInput = screen.getByPlaceholderText("Любой");
    await userEvent.type(cityInput, "Каз");
    expect(onCityChange).toHaveBeenCalled();

    const typeSelect = screen.getByLabelText("Тип партнёра");
    await userEvent.selectOptions(typeSelect, "store");
    expect(onPartnerTypeChange).toHaveBeenCalledWith("store");
  });
});
