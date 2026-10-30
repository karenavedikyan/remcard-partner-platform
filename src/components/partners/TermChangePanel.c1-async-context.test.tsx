import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TermChangePanel } from "./TermChangePanel";
import type { Partnership } from "@/lib/types";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const { remcardFetch } = await import("@/lib/api-client");

function partnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "p1",
    status: "ACTIVE",
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-me",
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
      id: "agent-me",
      displayName: "Agent",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    ...overrides,
  };
}

describe("TermChangePanel full async context binding", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("ACTIVE draft submit then PAUSED rerender: stale resolve must not call onChanged", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const onChanged = vi.fn();
    const active = partnership({ status: "ACTIVE" });

    const { rerender } = render(
      <TermChangePanel
        partnership={active}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    await userEvent.type(screen.getByTestId("term-draft-doors"), "15");
    expect(screen.getByTestId("term-change-submit")).toBeEnabled();
    await userEvent.click(screen.getByTestId("term-change-submit"));
    expect(remcardFetch).toHaveBeenCalledTimes(1);

    rerender(
      <TermChangePanel
        partnership={partnership({ status: "PAUSED" })}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    resolveFetch({});
    await waitFor(() => {
      expect(screen.queryByTestId("term-change-submit")).not.toBeInTheDocument();
    });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("stale success must not clear a newer draft after terms context change", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const onChanged = vi.fn();

    const { rerender } = render(
      <TermChangePanel
        partnership={partnership({
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
        })}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    await userEvent.type(screen.getByTestId("term-draft-doors"), "15");
    await userEvent.click(screen.getByTestId("term-change-submit"));
    expect(remcardFetch).toHaveBeenCalledTimes(1);

    // Server terms moved 10→12 while first POST pending — new context, fresh draft.
    rerender(
      <TermChangePanel
        partnership={partnership({
          terms: [
            {
              id: "t1",
              category: "doors",
              categoryLabel: "Двери",
              storePercent: 12,
              isExcluded: false,
              minMargin: null,
            },
          ],
        })}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    expect(screen.getByTestId("term-draft-doors")).toHaveValue(null);
    await userEvent.type(screen.getByTestId("term-draft-doors"), "17");
    expect(screen.getByTestId("term-draft-doors")).toHaveValue(17);

    resolveFetch({});
    await waitFor(() => {
      // Stale completion must leave the new draft intact.
      expect(screen.getByTestId("term-draft-doors")).toHaveValue(17);
    });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("A→B→A: stale Promise from first A does not apply after returning to A", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const onChanged = vi.fn();
    const base = partnership({ status: "ACTIVE" });

    const { rerender } = render(
      <TermChangePanel
        partnership={base}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    await userEvent.type(screen.getByTestId("term-draft-doors"), "15");
    await userEvent.click(screen.getByTestId("term-change-submit"));

    rerender(
      <TermChangePanel
        partnership={partnership({ status: "PAUSED" })}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );
    rerender(
      <TermChangePanel
        partnership={base}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    await userEvent.type(screen.getByTestId("term-draft-doors"), "18");
    resolveFetch({});
    await waitFor(() => {
      expect(screen.getByTestId("term-draft-doors")).toHaveValue(18);
    });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("revealSignal focuses the draft field", async () => {
    render(
      <TermChangePanel
        partnership={partnership()}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
        revealSignal={1}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("term-draft-doors")).toHaveFocus();
    });
  });

  it("unmount invalidates deferred propose — onChanged must not fire", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const onChanged = vi.fn();
    const { unmount } = render(
      <TermChangePanel
        partnership={partnership()}
        meId="agent-me"
        partnerTitle="Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    await userEvent.type(screen.getByTestId("term-draft-doors"), "15");
    await userEvent.click(screen.getByTestId("term-change-submit"));
    expect(remcardFetch).toHaveBeenCalledTimes(1);

    unmount();
    resolveFetch({});
    await Promise.resolve();
    await Promise.resolve();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("unmount invalidates deferred respond — onChanged must not fire", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const onChanged = vi.fn();
    const pending = {
      id: "qa-req1",
      requestedBy: "store-1",
      status: "PENDING" as const,
      changes: [{ category: "doors", newPercent: 15 }],
      expiresAt: "2099-01-01T00:00:00Z",
      createdAt: "2026-10-30T00:00:00Z",
      rejectionReason: null,
    };
    const { unmount } = render(
      <TermChangePanel
        partnership={partnership({ status: "PAUSED" })}
        meId="agent-me"
        partnerTitle="Store"
        requests={[pending]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    await userEvent.click(screen.getByTestId("term-change-approve-qa-req1"));
    expect(remcardFetch).toHaveBeenCalledTimes(1);

    unmount();
    resolveFetch({});
    await Promise.resolve();
    await Promise.resolve();
    expect(onChanged).not.toHaveBeenCalled();
  });
});
