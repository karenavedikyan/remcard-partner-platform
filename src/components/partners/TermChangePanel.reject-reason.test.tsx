import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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


function renderAsResponder() {
  return render(
    <TermChangePanel
      partnership={partnership}
      meId="agent-1"
      partnerTitle="Store"
      requests={[pending]}
      loadState="loaded"
      loadError=""
      onReload={() => {}}
      onChanged={() => {}}
      presentation="modal"
    />,
  );
}

describe("TermChangePanel rejection reason limit", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(remcardFetch).mockResolvedValue({});
  });

  it("sends a multiline reason untouched (trimmed at the edges only)", async () => {
    renderAsResponder();
    const reason = "Строка 1\nСтрока 2\n\nhttps://prof.remcard.ru/partners?terms=p1";
    fireEvent.change(screen.getByTestId("term-change-reason-req-1"), { target: { value: `  ${reason}  ` } });
    expect(screen.getByText(`${reason.length} / 1000`)).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("term-change-reject-req-1"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(remcardFetch).mock.calls[0]).toEqual([
      "/api/partnerships/p1/term-change/req-1/respond",
      { method: "POST", body: { action: "reject", rejectionReason: reason } },
    ]);
  });

  it("an empty reason is optional and is not sent", async () => {
    renderAsResponder();
    await userEvent.click(screen.getByTestId("term-change-reject-req-1"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(remcardFetch).mock.calls[0]![1]).toEqual({ method: "POST", body: { action: "reject" } });
  });

  it("exactly 1000 characters is allowed", async () => {
    renderAsResponder();
    fireEvent.change(screen.getByTestId("term-change-reason-req-1"), { target: { value: "а".repeat(1000) } });
    expect(screen.getByTestId("term-change-reject-req-1")).toBeEnabled();
    expect(screen.queryByText(/Сократите причину/)).not.toBeInTheDocument();
  });

  it("over 1000 characters shows an error, blocks rejecting, keeps the text and never submits", async () => {
    renderAsResponder();
    const long = "я".repeat(1001);
    fireEvent.change(screen.getByTestId("term-change-reason-req-1"), { target: { value: long } });
    expect(screen.getByText(/Сократите причину: не больше 1000 символов/)).toBeInTheDocument();
    expect(screen.getByTestId("term-change-reason-req-1")).toHaveValue(long);
    const reject = screen.getByTestId("term-change-reject-req-1");
    expect(reject).toBeDisabled();
    await userEvent.click(reject);
    expect(remcardFetch).not.toHaveBeenCalled();
    expect(screen.getByTestId("term-change-approve-req-1")).toBeEnabled();
  });

  it("approving never sends a reason", async () => {
    renderAsResponder();
    fireEvent.change(screen.getByTestId("term-change-reason-req-1"), { target: { value: "не нужно" } });
    await userEvent.click(screen.getByTestId("term-change-approve-req-1"));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(remcardFetch).mock.calls[0]![1]).toEqual({ method: "POST", body: { action: "approve" } });
  });
});
