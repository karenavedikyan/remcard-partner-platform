import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPartnerDiscoveryFilters } from "./AgentPartnerDiscoveryFilters";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(),
}));

const { fetchPartnerTaxonomy } = await import("@/lib/partner-taxonomy");

describe("AgentPartnerDiscoveryFilters P25d type change clears incompatible taxonomy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPartnerTaxonomy).mockResolvedValue({
      products: [{ kind: "product", id: "p1", label: "Плитка" }],
      services: [{ kind: "service", id: "s1", label: "Электромонтаж" }],
      stages: [{ kind: "stage", id: "st1", label: "Черновая" }],
    });
  });

  it("clears specialization and stage when partner type changes", async () => {
    const onSpecializationChange = vi.fn();
    const onStageChange = vi.fn();
    const onPartnerTypeChange = vi.fn();
    render(
      <AgentPartnerDiscoveryFilters
        layout="modal-full"
        specialization="services:s1"
        stageId="st1"
        city="Сочи"
        partnerType="store"
        onSpecializationChange={onSpecializationChange}
        onStageChange={onStageChange}
        onCityChange={vi.fn()}
        onPartnerTypeChange={onPartnerTypeChange}
      />,
    );
    await userEvent.click(screen.getByText(/Город и тип партнёра/));
    await userEvent.selectOptions(screen.getByTestId("discovery-partner-type"), "agent");
    expect(onPartnerTypeChange).toHaveBeenCalledWith("agent");
    expect(onSpecializationChange).toHaveBeenCalledWith("");
    expect(onStageChange).toHaveBeenCalledWith("");
  });

  it("preserves the independent prototype navigator when comparing partner types", async () => {
    const specialization = vi.fn(), stage = vi.fn(), type = vi.fn();
    render(<AgentPartnerDiscoveryFilters layout="modal-full" showDirectionFilters={false}
      specialization="services:s1" stageId="st1" city="Сочи" partnerType="store"
      onSpecializationChange={specialization} onStageChange={stage}
      onCityChange={vi.fn()} onPartnerTypeChange={type} />);
    await userEvent.selectOptions(screen.getByTestId("discovery-partner-type"), "agent");
    expect(type).toHaveBeenCalledWith("agent");
    expect(specialization).not.toHaveBeenCalled();
    expect(stage).not.toHaveBeenCalled();
  });
});
