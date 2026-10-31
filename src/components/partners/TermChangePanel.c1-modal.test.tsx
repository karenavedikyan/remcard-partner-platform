import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TermChangePanel } from "./TermChangePanel";
import type { Partnership, TermChangeRequest } from "@/lib/types";

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

const pending: TermChangeRequest = {
  id: "req-1",
  requestedBy: "store-1",
  status: "PENDING",
  changes: [{ category: "doors", newPercent: 17 }],
  expiresAt: "2099-01-01T00:00:00Z",
  createdAt: "2026-10-30T00:00:00Z",
  rejectionReason: null,
};

describe("TermChangePanel modal presentation (R1)", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("renders R1 table, notice, CTA; host owns close; Escape not handled by panel", async () => {
    const onCloseRequest = vi.fn();
    const onBusyChange = vi.fn();
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
        onCloseRequest={onCloseRequest}
        presentation="modal"
        onBusyChange={onBusyChange}
      />,
    );

    expect(screen.getByTestId("partner-term-change-panel")).toHaveAttribute(
      "data-presentation",
      "modal",
    );
    expect(screen.getByTestId("term-change-table")).toBeInTheDocument();
    expect(screen.getByText(/Новые условия начнут действовать только после согласия/)).toBeInTheDocument();
    expect(screen.getByTestId("term-change-disclaimer")).toBeInTheDocument();
    expect(screen.queryByText(/Активных запросов на изменение пока нет/)).not.toBeInTheDocument();
    expect(screen.getByTestId("term-change-submit")).toHaveTextContent(
      "Отправить на согласование",
    );
    expect(screen.queryByText("Изменить условия")).not.toBeInTheDocument();
    // Close lives on TermChangeModal, not the panel body
    expect(screen.queryByTestId("term-change-close")).not.toBeInTheDocument();
    expect(onBusyChange).toHaveBeenCalledWith(false);
    // R1 order: partner → notice → table → disclaimer (disclaimer after table in DOM)
    const panel = screen.getByTestId("partner-term-change-panel");
    const tableIdx = panel.innerHTML.indexOf('data-testid="term-change-table"');
    const discIdx = panel.innerHTML.indexOf('data-testid="term-change-disclaimer"');
    expect(tableIdx).toBeGreaterThan(-1);
    expect(discIdx).toBeGreaterThan(tableIdx);

    await userEvent.keyboard("{Escape}");
    expect(onCloseRequest).not.toHaveBeenCalled();
  });

  it("reports busy during submit and does not Escape-close from panel", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(remcardFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const onBusyChange = vi.fn();
    const onCloseRequest = vi.fn();

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
        onCloseRequest={onCloseRequest}
        presentation="modal"
        onBusyChange={onBusyChange}
      />,
    );

    await userEvent.type(screen.getByTestId("term-draft-doors"), "15");
    await userEvent.click(screen.getByTestId("term-change-submit"));
    await waitFor(() => {
      expect(onBusyChange).toHaveBeenCalledWith(true);
    });
    await userEvent.keyboard("{Escape}");
    expect(onCloseRequest).not.toHaveBeenCalled();
    resolveFetch({});
    await waitFor(() => {
      expect(onBusyChange).toHaveBeenCalledWith(false);
    });
  });

  it("pending: table is read-only and submit CTA is hidden (R1 view mode)", () => {
    render(
      <TermChangePanel
        partnership={partnership}
        meId="agent-1"
        partnerTitle="Store"
        requests={[pending]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={() => {}}
        onCloseRequest={() => {}}
        presentation="modal"
      />,
    );

    expect(screen.queryByTestId("term-change-submit")).not.toBeInTheDocument();
    expect(screen.queryByTestId("term-draft-doors")).not.toBeInTheDocument();
    expect(screen.getByTestId("term-compare-doors")).toHaveTextContent("17%");
    expect(screen.getByTestId("term-change-cancel")).toBeInTheDocument();
  });

  it("open/cancel do not mutate; submit still POSTs term-change payload", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({});
    const onChanged = vi.fn();
    const onCloseRequest = vi.fn();
    render(
      <TermChangePanel
        partnership={partnership}
        meId="store-1"
        partnerTitle="Partner Name"
        requests={[]}
        loadState="loaded"
        loadError=""
        onReload={() => {}}
        onChanged={onChanged}
        onCloseRequest={onCloseRequest}
        presentation="modal"
      />,
    );

    expect(remcardFetch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("term-change-cancel"));
    expect(onCloseRequest).toHaveBeenCalledTimes(1);
    expect(remcardFetch).not.toHaveBeenCalled();

    await userEvent.type(screen.getByTestId("term-draft-doors"), "12");
    await userEvent.click(screen.getByTestId("term-change-submit"));
    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(remcardFetch).mock.calls[0]?.[0]).toBe(
      "/api/partnerships/p1/term-change",
    );
    expect(vi.mocked(remcardFetch).mock.calls[0]?.[1]?.method).toBe("POST");
    expect(vi.mocked(remcardFetch).mock.calls[0]?.[1]?.body).toEqual({
      changes: [{ category: "doors", newPercent: 12 }],
    });
  });
});
