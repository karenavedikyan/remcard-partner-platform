import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPartnerDiscoveryFilters } from "./AgentPartnerDiscoveryFilters";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(),
}));

const { fetchPartnerTaxonomy } = await import("@/lib/partner-taxonomy");

describe("AgentPartnerDiscoveryFilters P25a modal-full vs search DTO", () => {
  beforeEach(() => {
    vi.mocked(fetchPartnerTaxonomy).mockResolvedValue({
      products: [],
      services: [],
      stages: [],
    });
  });

  it("keeps filter slugs agent/specialist/store/company (MASTER/AGENT stay API-side)", async () => {
    render(
      <AgentPartnerDiscoveryFilters
        layout="modal-full"
        specialization=""
        stageId=""
        city=""
        partnerType=""
        onSpecializationChange={vi.fn()}
        onStageChange={vi.fn()}
        onCityChange={vi.fn()}
        onPartnerTypeChange={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText("Город и тип партнёра"));
    const values = Array.from(screen.getByTestId("discovery-partner-type").querySelectorAll("option")).map(
      (o) => o.getAttribute("value"),
    );
    expect(values).toEqual(["", "store", "company", "specialist", "agent"]);
    expect(values).not.toContain("MASTER");
    expect(values).not.toContain("AGENT");
  });

  it("does not refetch taxonomy on benign controlled rerender", async () => {
    const { rerender } = render(
      <AgentPartnerDiscoveryFilters
        layout="modal-full"
        specialization=""
        stageId=""
        city="Казань"
        partnerType="store"
        onSpecializationChange={vi.fn()}
        onStageChange={vi.fn()}
        onCityChange={vi.fn()}
        onPartnerTypeChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(fetchPartnerTaxonomy.mock.calls.length).toBeGreaterThan(0);
    });
    const callsAfterMount = fetchPartnerTaxonomy.mock.calls.length;
    rerender(
      <AgentPartnerDiscoveryFilters
        layout="modal-full"
        specialization="services:s1"
        stageId=""
        city="Казань"
        partnerType="store"
        onSpecializationChange={vi.fn()}
        onStageChange={vi.fn()}
        onCityChange={vi.fn()}
        onPartnerTypeChange={vi.fn()}
      />,
    );
    expect(fetchPartnerTaxonomy.mock.calls.length).toBe(callsAfterMount);
  });
});
