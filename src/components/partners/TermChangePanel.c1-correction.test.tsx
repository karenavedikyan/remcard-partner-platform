import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TermChangePanel } from "./TermChangePanel";
import type { Partnership, TermChangeRequest } from "@/lib/types";

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

const { remcardFetch, RemcardApiError } = await import("@/lib/api-client");

function basePartnership(overrides: Partial<Partnership> = {}): Partnership {
  return {
    id: "qa-p1",
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
      displayName: "Synthetic Store",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-me",
      displayName: "Synthetic Agent",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    ...overrides,
  };
}

const pendingFromStore: TermChangeRequest = {
  id: "qa-req1",
  requestedBy: "store-1",
  status: "PENDING",
  changes: [{ category: "doors", newPercent: 15 }],
  expiresAt: "2099-01-01T00:00:00Z",
  createdAt: "2026-10-30T00:00:00Z",
  rejectionReason: null,
};

describe("TermChangePanel C1 correction", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("PAUSED: respond error shows shared alert outside ACTIVE-only proposal", async () => {
    vi.mocked(remcardFetch).mockRejectedValue(
      new RemcardApiError(500, "synthetic response failed"),
    );

    render(
      <TermChangePanel
        partnership={basePartnership({ status: "PAUSED" })}
        meId="agent-me"
        partnerTitle="Synthetic Store"
        requests={[pendingFromStore]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
      />,
    );

    expect(screen.queryByTestId("term-change-submit")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("term-change-approve-qa-req1"));
    await waitFor(() => {
      expect(screen.getByTestId("term-change-error")).toHaveTextContent(
        "synthetic response failed",
      );
    });
    expect(screen.getByRole("alert")).toHaveTextContent("synthetic response failed");
    expect(remcardFetch).toHaveBeenCalledTimes(1);
  });

  it("context guard: valid participant draft then nonparticipant rerender blocks POST", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({});
    const partnership = basePartnership();
    const { rerender } = render(
      <TermChangePanel
        partnership={partnership}
        meId="agent-me"
        partnerTitle="Synthetic Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
      />,
    );

    const input = screen.getByLabelText(/Предлагаете/i);
    await userEvent.clear(input);
    await userEvent.type(input, "15");
    expect(screen.getByTestId("term-change-submit")).toBeEnabled();

    rerender(
      <TermChangePanel
        partnership={partnership}
        meId="nonparticipant"
        partnerTitle="Synthetic Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
      />,
    );

    expect(screen.getByTestId("partner-term-change-panel")).toHaveAttribute(
      "data-participant",
      "false",
    );
    expect(screen.getByTestId("term-change-submit")).toBeDisabled();
    // Native click on disabled control must not POST; sync guard covers enabled stale paths too.
    screen.getByTestId("term-change-submit").click();
    expect(remcardFetch).not.toHaveBeenCalled();
  });

  it("sync guard blocks respond when meId becomes nonparticipant while approve enabled", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({});
    const partnership = basePartnership({ status: "PAUSED" });
    const { rerender } = render(
      <TermChangePanel
        partnership={partnership}
        meId="agent-me"
        partnerTitle="Synthetic Store"
        requests={[pendingFromStore]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
      />,
    );

    expect(screen.getByTestId("term-change-approve-qa-req1")).toBeEnabled();

    rerender(
      <TermChangePanel
        partnership={partnership}
        meId="nonparticipant"
        partnerTitle="Synthetic Store"
        requests={[pendingFromStore]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
      />,
    );

    // Button disabled for nonparticipant; invoke handler path via click anyway in case of stale enablement
    const approve = screen.getByTestId("term-change-approve-qa-req1");
    expect(approve).toBeDisabled();
    approve.click();
    expect(remcardFetch).not.toHaveBeenCalled();
  });

  it("context invalidate clears dirty draft when meId/status/terms change", async () => {
    const onDirtyChange = vi.fn();
    const partnership = basePartnership();
    const { rerender } = render(
      <TermChangePanel
        partnership={partnership}
        meId="agent-me"
        partnerTitle="Synthetic Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
        onDirtyChange={onDirtyChange}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Предлагаете/i), "15");
    await waitFor(() => {
      expect(screen.getByTestId("partner-term-change-panel")).toHaveAttribute(
        "data-dirty",
        "true",
      );
    });

    rerender(
      <TermChangePanel
        partnership={basePartnership({ status: "PAUSED" })}
        meId="agent-me"
        partnerTitle="Synthetic Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
        onDirtyChange={onDirtyChange}
      />,
    );

    expect(screen.getByTestId("partner-term-change-panel")).toHaveAttribute(
      "data-dirty",
      "false",
    );
  });

  it("stale async completion after meId change does not apply to new context", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const partnership = basePartnership();
    const onChanged = vi.fn();
    const { rerender } = render(
      <TermChangePanel
        partnership={partnership}
        meId="agent-me"
        partnerTitle="Synthetic Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Предлагаете/i), "15");
    await userEvent.click(screen.getByTestId("term-change-submit"));
    expect(remcardFetch).toHaveBeenCalledTimes(1);

    rerender(
      <TermChangePanel
        partnership={partnership}
        meId="other-agent"
        partnerTitle="Synthetic Store"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
      />,
    );

    resolveFetch({});
    await waitFor(() => {
      expect(screen.getByTestId("term-change-submit")).not.toHaveTextContent("Отправка");
    });
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("load error blocks propose until successful reload", async () => {
    render(
      <TermChangePanel
        partnership={basePartnership()}
        meId="agent-me"
        partnerTitle="Synthetic Store"
        requests={null}
        loadState="error"
        loadError="Не удалось загрузить"
        onReload={() => {}}
        onChanged={() => {}}
      />,
    );

    expect(screen.getByTestId("term-change-retry")).toBeInTheDocument();
    expect(screen.getByTestId("term-change-submit")).toBeDisabled();
  });
});
