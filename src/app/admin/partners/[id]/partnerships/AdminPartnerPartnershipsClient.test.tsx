import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  fetchAdminPartnerPartnerships: vi.fn(),
}));

const searchParamsRef = vi.hoisted(() => ({
  current: new URLSearchParams("status=ACTIVE&contextName=Owner+Partner"),
}));

vi.mock("@/lib/prof-admin-partners-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-partners-api")>();
  return { ...actual, fetchAdminPartnerPartnerships: api.fetchAdminPartnerPartnerships };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsRef.current,
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

function defer<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderClient() {
  return render(
    <Suspense fallback={null}>
      <AdminPartnerPartnershipsClient partnerUserId="owner-1" />
    </Suspense>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  searchParamsRef.current = new URLSearchParams("status=ACTIVE&contextName=Owner+Partner");
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

  it("shows honest empty state and zero counts for successful empty response", async () => {
    api.fetchAdminPartnerPartnerships.mockResolvedValue({ items: [], total: 0, nextCursor: null });
    renderClient();
    expect(await screen.findByRole("status")).toHaveTextContent(/записей нет/i);
    expect(screen.getByTestId("partnerships-selection-summary").textContent).toMatch(/В выборке:\s*0/);
  });

  it("surfaces errors with retry without fake zero selection summary", async () => {
    api.fetchAdminPartnerPartnerships.mockRejectedValueOnce(new Error("Проверочная недоступность API"));
    renderClient();
    expect(await screen.findByRole("alert")).toHaveTextContent("Проверочная недоступность API");
    expect(screen.getByTestId("partnerships-selection-summary").textContent).not.toMatch(/В выборке:\s*0/);
    expect(screen.getByTestId("partnerships-selection-summary").textContent).toMatch(/В выборке:\s*—/);
    api.fetchAdminPartnerPartnerships.mockResolvedValue({ items: [item], total: 1, nextCursor: null });
    await userEvent.setup().click(screen.getByRole("button", { name: "Повторить" }));
    await screen.findByText("Counterparty Nine");
  });

  it("ignores late success from superseded ACTIVE fetch after switching to ENDED", async () => {
    const activeDeferred = defer<{ items: typeof item[]; total: number; nextCursor: null }>();
    const endedDeferred = defer<{ items: typeof item[]; total: number; nextCursor: null }>();

    api.fetchAdminPartnerPartnerships.mockImplementation((_id, opts) => {
      if (opts.status === "ACTIVE") return activeDeferred.promise;
      if (opts.status === "ENDED") return endedDeferred.promise;
      return Promise.resolve({ items: [], total: 0, nextCursor: null });
    });

    const { rerender } = renderClient();
    searchParamsRef.current = new URLSearchParams("status=ENDED");
    rerender(
      <Suspense fallback={null}>
        <AdminPartnerPartnershipsClient partnerUserId="owner-1" />
      </Suspense>,
    );

    endedDeferred.resolve({
      items: [
        {
          ...item,
          id: "ps-ended",
          status: "ENDED",
          partner: { ...item.partner, displayName: "Текущий завершённый партнёр" },
        },
      ],
      total: 1,
      nextCursor: null,
    });
    await screen.findByText("Текущий завершённый партнёр");

    activeDeferred.resolve({
      items: [
        {
          ...item,
          id: "ps-stale",
          partner: { ...item.partner, displayName: "Старый активный партнёр" },
        },
      ],
      total: 1,
      nextCursor: null,
    });

    await waitFor(() => expect(screen.queryByText("Старый активный партнёр")).toBeNull());
    expect(screen.getByText("Текущий завершённый партнёр")).toBeTruthy();
  });

  it("ignores late error from superseded fetch without clearing the current ENDED list", async () => {
    const activeDeferred = defer<{ items: typeof item[]; total: number; nextCursor: null }>();
    const endedDeferred = defer<{ items: typeof item[]; total: number; nextCursor: null }>();

    api.fetchAdminPartnerPartnerships.mockImplementation((_id, opts) => {
      if (opts.status === "ACTIVE") return activeDeferred.promise;
      if (opts.status === "ENDED") return endedDeferred.promise;
      return Promise.resolve({ items: [], total: 0, nextCursor: null });
    });

    const { rerender } = renderClient();
    searchParamsRef.current = new URLSearchParams("status=ENDED");
    rerender(
      <Suspense fallback={null}>
        <AdminPartnerPartnershipsClient partnerUserId="owner-1" />
      </Suspense>,
    );

    endedDeferred.resolve({
      items: [
        {
          ...item,
          id: "ps-ended",
          status: "ENDED",
          partner: { ...item.partner, displayName: "Текущий завершённый партнёр" },
        },
      ],
      total: 1,
      nextCursor: null,
    });
    await screen.findByText("Текущий завершённый партнёр");

    activeDeferred.reject(new Error("Старый ACTIVE упал"));

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByText("Текущий завершённый партнёр")).toBeTruthy();
    expect(screen.getByTestId("partnerships-selection-summary").textContent).toMatch(/В выборке:\s*1/);
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
