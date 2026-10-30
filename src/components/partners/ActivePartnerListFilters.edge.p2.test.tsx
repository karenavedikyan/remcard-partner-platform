/** @vitest-environment jsdom */
/**
 * P2 edge regressions (LOCAL FIXTURE):
 * 1) city option identity after visibility switch
 * 2) taxonomy latest-request-wins (stale error must not wipe success)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { ActivePartnerListFilters } from "./ActivePartnerListFilters";

const fetchTaxonomy = vi.fn();
const { MockRemcardApiError } = vi.hoisted(() => {
  class MockRemcardApiError extends Error {
    status = 503;
    constructor(message: string) {
      super(message);
      this.name = "RemcardApiError";
    }
  }
  return { MockRemcardApiError };
});

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: (...args: unknown[]) => fetchTaxonomy(...args),
}));

vi.mock("@/lib/api-client", () => ({
  RemcardApiError: MockRemcardApiError,
}));

const baseProps = {
  partnerType: "" as const,
  specialization: "",
  stageId: "",
  city: "Ёлкино",
  cityOptions: ["Ёлкино"],
  archiveView: "active" as const,
  status: "" as const,
  sort: "updated_desc" as const,
  taxonomyResetKey: 0,
  onPartnerTypeChange: vi.fn(),
  onSpecializationChange: vi.fn(),
  onStageChange: vi.fn(),
  onCityChange: vi.fn(),
  onArchiveViewChange: vi.fn(),
  onStatusChange: vi.fn(),
  onSortChange: vi.fn(),
  onTaxonomyLabelsChange: vi.fn(),
};

describe("ActivePartnerListFilters P2 edges", () => {
  beforeEach(() => {
    fetchTaxonomy.mockReset();
    fetchTaxonomy.mockResolvedValue({
      products: [],
      services: [{ kind: "service", id: "paint", label: "Малярные работы" }],
      stages: [],
    });
    baseProps.onTaxonomyLabelsChange = vi.fn();
  });

  it("keeps a single city option for ё/е identity when archive options differ in spelling", async () => {
    const { rerender } = render(
      <ActivePartnerListFilters {...baseProps} city="Ёлкино" cityOptions={["Ёлкино"]} />,
    );
    await waitFor(() => expect(screen.getByTestId("active-partner-city")).toBeInTheDocument());

    // Visibility → archive: collection only exposes «елкино».
    rerender(
      <ActivePartnerListFilters
        {...baseProps}
        archiveView="archive"
        city="Ёлкино"
        cityOptions={["елкино"]}
      />,
    );

    const select = screen.getByTestId("active-partner-city");
    const cityLabels = within(select)
      .getAllByRole("option")
      .map((o) => (o.textContent ?? "").trim())
      .filter((t) => t && t !== "Все города");
    expect(cityLabels).toHaveLength(1);
    expect(cityLabels[0]).toBe("Ёлкино");
    expect(select).toHaveValue("Ёлкино");
  });

  it("ignores a stale taxonomy error after a newer successful load (reset race)", async () => {
    let rejectFirst!: (e: unknown) => void;
    const first = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });
    let resolveSecond!: (v: unknown) => void;
    const second = new Promise((resolve) => {
      resolveSecond = resolve;
    });

    let call = 0;
    fetchTaxonomy.mockImplementation(() => {
      call += 1;
      return call === 1 ? first : second;
    });

    const labels = vi.fn();
    const { rerender } = render(
      <ActivePartnerListFilters
        {...baseProps}
        city=""
        cityOptions={[]}
        taxonomyResetKey={0}
        onTaxonomyLabelsChange={labels}
      />,
    );

    // Reset triggers a newer taxonomy GET while the first is still pending.
    rerender(
      <ActivePartnerListFilters
        {...baseProps}
        city=""
        cityOptions={[]}
        taxonomyResetKey={1}
        onTaxonomyLabelsChange={labels}
      />,
    );

    await act(async () => {
      resolveSecond({
        products: [],
        services: [{ kind: "service", id: "paint", label: "Малярные работы" }],
        stages: [],
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Малярные работы" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const labelsAfterSuccess = labels.mock.calls.length;
    expect(labelsAfterSuccess).toBeGreaterThan(0);
    expect(labels.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        services: expect.objectContaining({ paint: "Малярные работы" }),
      }),
    );

    await act(async () => {
      rejectFirst(new MockRemcardApiError("Сервис недоступен"));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole("option", { name: "Малярные работы" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Повторить/i })).not.toBeInTheDocument();
    expect(labels.mock.calls.length).toBe(labelsAfterSuccess);
    expect(labels.mock.calls.at(-1)?.[0]).not.toBeNull();
  });

  it("latest real taxonomy error still surfaces Повторить", async () => {
    fetchTaxonomy.mockRejectedValue(new MockRemcardApiError("Сервис недоступен"));
    render(
      <ActivePartnerListFilters
        {...baseProps}
        city=""
        cityOptions={[]}
        onTaxonomyLabelsChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Сервис недоступен/i);
    });
    expect(screen.getByRole("button", { name: /Повторить/i })).toBeInTheDocument();
  });
});
