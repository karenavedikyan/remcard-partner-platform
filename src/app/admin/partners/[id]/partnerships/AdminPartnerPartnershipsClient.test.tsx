import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  fetchAdminPartnerPartnerships: vi.fn(),
}));
vi.mock("@/lib/prof-admin-partners-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-partners-api")>();
  return { ...actual, fetchAdminPartnerPartnerships: api.fetchAdminPartnerPartnerships };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("status=ACTIVE&contextName=Owner+Partner"),
}));

import { AdminPartnerPartnershipsClient } from "./AdminPartnerPartnershipsClient";

const item = {
  id: "ps-1",
  status: "ACTIVE",
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-02T12:00:00.000Z",
  partner: {
    id: "counter-9",
    publicId: "RC-9",
    displayName: "Counterparty Nine",
    partnerKind: "specialist" as const,
    city: "SPB",
  },
};

function renderClient() {
  return render(
    <Suspense fallback={null}>
      <AdminPartnerPartnershipsClient partnerUserId="owner-1" />
    </Suspense>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAdminPartnerPartnerships.mockResolvedValue({
    items: [item],
    total: 1,
    nextCursor: null,
  });
});

describe("AdminPartnerPartnershipsClient", () => {
  it("lazy-fetches partnerships for the selected status filter", async () => {
    renderClient();
    await screen.findByText("Counterparty Nine");
    expect(api.fetchAdminPartnerPartnerships).toHaveBeenCalledWith("owner-1", {
      status: "ACTIVE",
      limit: 25,
      cursor: null,
    });
    expect(screen.getByRole("link", { name: "Открыть профиль" })).toHaveAttribute(
      "href",
      "/admin/moderation/partners/counter-9",
    );
  });

  it("shows honest empty state for zero results", async () => {
    api.fetchAdminPartnerPartnerships.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    renderClient();
    expect(await screen.findByRole("status")).toHaveTextContent(/записей нет/i);
  });

  it("surfaces errors with retry without treating them as zero", async () => {
    api.fetchAdminPartnerPartnerships.mockRejectedValueOnce(new Error("upstream down"));
    renderClient();
    expect(await screen.findByRole("alert")).toHaveTextContent("upstream down");
    api.fetchAdminPartnerPartnerships.mockResolvedValue({ items: [item], total: 1, nextCursor: null });
    await userEvent.setup().click(screen.getByRole("button", { name: "Повторить" }));
    await screen.findByText("Counterparty Nine");
  });

  it("requests next cursor on pagination", async () => {
    api.fetchAdminPartnerPartnerships
      .mockResolvedValueOnce({ items: [item], total: 30, nextCursor: "page-2" })
      .mockResolvedValueOnce({ items: [item], total: 30, nextCursor: null });
    const ui = userEvent.setup();
    renderClient();
    await screen.findByText("Counterparty Nine");
    await ui.click(screen.getByRole("button", { name: "Дальше" }));
    await waitFor(() =>
      expect(api.fetchAdminPartnerPartnerships).toHaveBeenLastCalledWith("owner-1", {
        status: "ACTIVE",
        limit: 25,
        cursor: "page-2",
      }),
    );
  });
});
