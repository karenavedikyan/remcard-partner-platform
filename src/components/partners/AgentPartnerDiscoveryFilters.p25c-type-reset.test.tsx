import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPartnerDiscoveryFilters } from "./AgentPartnerDiscoveryFilters";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(),
}));

const { fetchPartnerTaxonomy } = await import("@/lib/partner-taxonomy");

describe("AgentPartnerDiscoveryFilters P25c type change clears specialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPartnerTaxonomy).mockResolvedValue({
      products: [{ kind: "product", id: "p1", label: "Плитка" }],
      services: [{ kind: "service", id: "s1", label: "Электромонтаж" }],
      stages: [{ kind: "stage", id: "st1", label: "Черновая" }],
    });
  });

  it("clears specialization when partner type changes (taxonomy reset contract)", async () => {
    const onSpecializationChange = vi.fn();
    const onPartnerTypeChange = vi.fn();
    render(
      <AgentPartnerDiscoveryFilters
        layout="modal-full"
        specialization="services:s1"
        stageId=""
        city=""
        partnerType="store"
        onSpecializationChange={onSpecializationChange}
        onStageChange={vi.fn()}
        onCityChange={vi.fn()}
        onPartnerTypeChange={onPartnerTypeChange}
      />,
    );
    await userEvent.click(screen.getByText(/Город и тип партнёра/));
    await userEvent.selectOptions(screen.getByTestId("discovery-partner-type"), "company");
    expect(onPartnerTypeChange).toHaveBeenCalledWith("company");
    expect(onSpecializationChange).toHaveBeenCalledWith("");
  });
});
