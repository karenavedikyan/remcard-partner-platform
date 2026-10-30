import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TermChangePanel } from "./TermChangePanel";
import type { Partnership } from "@/lib/types";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

const { remcardFetch } = await import("@/lib/api-client");

const partnership: Partnership = {
  id: "p1",
  status: "ACTIVE",
  initiatedBy: "store-1",
  pendingProposedBy: null,
  note: null,
  createdAt: "",
  updatedAt: "",
  storeUserId: "store-1",
  proUserId: "agent-1",
  terms: [
    {
      id: "t1",
      category: "doors",
      categoryLabel: "Двери",
      storePercent: 10,
      isExcluded: false,
      minMargin: null,
    },
  ],
  storeUser: {
    id: "store-1",
    displayName: "Store",
    city: "Краснодар",
    specializations: [],
    storeCategories: ["doors"],
    partnerType: "STORE",
  },
  proUser: {
    id: "agent-1",
    displayName: "Partner Name",
    city: "Краснодар",
    specializations: [],
    storeCategories: [],
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
  },
};

describe("TermChangePanel C1", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("reports dirty via onDirtyChange when a draft percent differs", async () => {
    const onDirtyChange = vi.fn();
    render(
      <TermChangePanel
        partnership={partnership}
        meId="store-1"
        partnerTitle="Partner Name"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
        onDirtyChange={onDirtyChange}
        onCloseRequest={() => {}}
      />,
    );

    expect(onDirtyChange).toHaveBeenCalledWith(false);
    const input = screen.getByLabelText(/Предлагаете/i);
    await userEvent.clear(input);
    await userEvent.type(input, "12");
    await waitFor(() => {
      expect(onDirtyChange).toHaveBeenCalledWith(true);
    });
    expect(screen.getByTestId("partner-term-change-panel")).toHaveAttribute(
      "data-dirty",
      "true",
    );
  });

  it("blocks submit until loadState===loaded", async () => {
    render(
      <TermChangePanel
        partnership={partnership}
        meId="store-1"
        partnerTitle="Partner Name"
        requests={null}
        loadState="loading"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
      />,
    );

    const submit = screen.getByTestId("term-change-submit");
    expect(submit).toBeDisabled();
    expect(remcardFetch).not.toHaveBeenCalled();
  });

  it("busy/reentry guard prevents duplicate submit while request in flight", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <TermChangePanel
        partnership={partnership}
        meId="store-1"
        partnerTitle="Partner Name"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
      />,
    );

    const input = screen.getByLabelText(/Предлагаете/i);
    await userEvent.type(input, "15");
    const submit = screen.getByTestId("term-change-submit");
    await userEvent.click(submit);
    await userEvent.click(submit);
    expect(remcardFetch).toHaveBeenCalledTimes(1);
    resolveFetch({});
    await waitFor(() => {
      expect(screen.getByTestId("term-change-submit")).not.toHaveTextContent("Отправка");
    });
  });

  it("shows partner name, side-by-side compare and prior-terms notice", () => {
    render(
      <TermChangePanel
        partnership={partnership}
        meId="store-1"
        partnerTitle="Partner Name"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
        onCloseRequest={() => {}}
      />,
    );

    expect(screen.getByTestId("term-change-partner-name")).toHaveTextContent("Partner Name");
    expect(screen.getByText(/До согласования действуют прежние условия/)).toBeInTheDocument();
    expect(screen.getByTestId("term-compare-doors")).toHaveTextContent("10%");
    expect(screen.getByTestId("term-change-close")).toBeInTheDocument();
    expect(screen.getByTestId("term-change-cancel")).toBeInTheDocument();
  });
});
