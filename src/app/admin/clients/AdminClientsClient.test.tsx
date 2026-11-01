import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";

const fetchAdminClients = vi.fn();
vi.mock("@/lib/prof-admin-clients-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prof-admin-clients-api")>(
    "@/lib/prof-admin-clients-api",
  );
  return {
    ...actual,
    fetchAdminClients: (...args: unknown[]) => fetchAdminClients(...args),
  };
});

import { AdminClientsClient } from "./AdminClientsClient";

const clientFixture = (n: number) => ({
  id: `c-${n}`,
  publicId: `RC-C${n}`,
  displayName: `Клиент ${n}`,
  role: "CLIENT" as const,
  city: n % 2 ? "Краснодар" : null,
  photoUrl: null,
  clientAvatarUrl: null,
  isBlocked: n === 2,
  createdAt: `2025-0${(n % 9) + 1}-15T00:00:00.000Z`,
});

function funnel(registered: number) {
  return {
    registered,
    profileFilled: Math.max(0, registered - 1),
    firstAction: Math.max(0, registered - 3),
    activeRecently: Math.min(registered, 4),
    pctProfile: registered ? 90 : 0,
    pctFirst: registered ? 40 : 0,
    pctActive: registered ? 25 : 0,
  };
}

describe("AdminClientsClient", () => {
  beforeEach(() => {
    fetchAdminClients.mockReset();
  });

  it("renders readonly table without product-only funnel panel", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(1), clientFixture(2)],
      total: 12,
      page: 1,
      totalPages: 2,
      funnel: funnel(12),
    });
    render(<AdminClientsClient />);
    await screen.findByRole("heading", { name: "Клиенты", level: 1 });
    expect((await screen.findAllByText("Клиент 1")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("clients-total").textContent).toBe("12");
    expect(screen.getByTestId("clients-range").textContent).toMatch(/1–2 из 12/);
    expect(screen.queryByTestId("clients-funnel")).toBeNull();
    expect(screen.getByTestId("clients-period-gap").textContent).toMatch(/дату регистрации клиента/);
    expect(screen.getByTestId("clients-period-gap").textContent).toMatch(/московскому времени/);
    expect(screen.getByTestId("clients-period-gap").textContent).not.toMatch(/721708c4|A23e|fe8685e6|Candidate/);
    expect(screen.getByTestId("clients-period-gap").textContent).not.toMatch(
      /90 дней пока недоступно/,
    );
    expect(screen.getByTestId("clients-kpi-orders-gap")).toBeTruthy();
    expect(screen.getByTestId("clients-kpi-deals-gap")).toBeTruthy();
    expect(screen.getAllByTestId("clients-source-gap")[0]!.textContent).toBe("—");
    expect(screen.getAllByTestId("clients-stage-gap")[0]!.textContent).toBe("—");
    expect(screen.queryByRole("button", { name: /создать|удалить|редактир/i })).toBeNull();
    expect(screen.getByTestId("clients-table")).toHaveAttribute("data-mode", "list");
    expect(screen.getByTestId("client-search")).toHaveAttribute("placeholder", "Имя клиента");

    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(1)],
      total: 1,
      page: 1,
      totalPages: 1,
      funnel: funnel(12),
    });
    fireEvent.change(screen.getByTestId("client-search"), { target: { value: "Клиент 1" } });
    await waitFor(() => {
      const last = fetchAdminClients.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(last).toMatchObject({
        search: "Клиент 1",
        page: 1,
        limit: 10,
        period: "all",
      });
      expect(last).not.toHaveProperty("funnel");
    });
  });

  it("shows empty, error+retry states", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [],
      total: 0,
      page: 1,
      totalPages: 1,
      funnel: funnel(0),
    });
    const view = render(<AdminClientsClient />);
    expect(await screen.findByText("Клиентов пока нет")).toBeTruthy();
    view.unmount();

    fetchAdminClients.mockRejectedValue(new RemcardApiError(500, "qa-offline"));
    render(<AdminClientsClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent("qa-offline");
    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(3)],
      total: 1,
      page: 1,
      totalPages: 1,
      funnel: funnel(1),
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Повторить" }));
    expect((await screen.findAllByText("Клиент 3")).length).toBeGreaterThan(0);
  });

  it("pages forward with next control", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(1)],
      total: 15,
      page: 1,
      totalPages: 2,
      funnel: funnel(15),
    });
    render(<AdminClientsClient />);
    expect((await screen.findAllByText("Клиент 1")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("clients-range").textContent).toMatch(/1–1 из 15/);
    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(11)],
      total: 15,
      page: 2,
      totalPages: 2,
      funnel: funnel(15),
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Следующая страница" }));
    await waitFor(() =>
      expect(fetchAdminClients).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
    expect((await screen.findAllByText("Клиент 11")).length).toBeGreaterThan(0);
  });

  it("applies legacy calendar month without combining createdFrom/To", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(1)],
      total: 4,
      page: 1,
      totalPages: 1,
      funnel: funnel(20),
    });
    render(<AdminClientsClient />);
    await screen.findByTestId("clients-period-gap");
    await userEvent.setup().selectOptions(screen.getByTestId("client-period"), "month");
    await waitFor(() =>
      expect(fetchAdminClients).toHaveBeenCalledWith(
        expect.objectContaining({ period: "month" }),
      ),
    );
    const last = fetchAdminClients.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(last.period).toBe("month");
    expect(last.createdFrom).toBeUndefined();
    expect(last.createdTo).toBeUndefined();
    expect(screen.getByTestId("clients-help").textContent).toMatch(/Источник рекомендации/);
    expect(screen.getByTestId("clients-help").textContent).toMatch(/этап сделки/);
    expect(screen.getByTestId("clients-help").textContent).not.toMatch(/search<\/code>|GET \/api/);
  });

  it("clears previous window totals/rows as soon as the active registration window changes", async () => {
    let resolveSeven!: (v: unknown) => void;
    const seven = new Promise((r) => {
      resolveSeven = r;
    });
    let rolling = 0;
    fetchAdminClients.mockImplementation(async (q: { createdFrom?: string }) => {
      if (!q.createdFrom) {
        return {
          users: [clientFixture(1)],
          total: 23,
          page: 1,
          totalPages: 3,
          funnel: funnel(23),
        };
      }
      rolling += 1;
      if (rolling === 1) {
        return {
          users: [{ ...clientFixture(90), displayName: "Клиент окна 90д" }],
          total: 40,
          page: 1,
          totalPages: 4,
          funnel: funnel(23),
        };
      }
      return seven;
    });

    const ui = userEvent.setup();
    render(<AdminClientsClient />);
    await screen.findByTestId("client-period");
    await ui.selectOptions(screen.getByTestId("client-period"), "90d");
    await waitFor(() => {
      expect(screen.getByTestId("clients-kpi-period").textContent).toMatch(/40/);
      expect(screen.getAllByText("Клиент окна 90д").length).toBeGreaterThan(0);
    });

    await ui.selectOptions(screen.getByTestId("client-period"), "7d");
    // Active label is already 7d — previous 90d total/rows must not keep painting.
    await waitFor(() => {
      expect(screen.getByTestId("clients-kpi-period").textContent).toMatch(/7 дней/);
    });
    expect(screen.getByTestId("clients-kpi-period").textContent).not.toMatch(/40/);
    expect(screen.getByTestId("clients-kpi-period").textContent).toMatch(/—/);
    expect(screen.queryByText("Клиент окна 90д")).toBeNull();
    expect(screen.getByTestId("clients-count-hint").textContent).toMatch(/0 клиентов/);

    await act(async () => {
      resolveSeven({
        users: [{ ...clientFixture(7), displayName: "Окно 7д" }],
        total: 3,
        page: 1,
        totalPages: 1,
        funnel: funnel(23),
      });
    });
    await waitFor(() => {
      expect(screen.getByTestId("clients-kpi-period").textContent).toMatch(/3/);
      expect(screen.getAllByText("Окно 7д").length).toBeGreaterThan(0);
    });
  });

  it("does not repaint a delayed previous registration window after a newer window resolves", async () => {
    let resolveNinety!: (v: unknown) => void;
    const ninety = new Promise((r) => {
      resolveNinety = r;
    });
    let rolling = 0;
    fetchAdminClients.mockImplementation(async (q: { createdFrom?: string }) => {
      if (!q.createdFrom) {
        return {
          users: [clientFixture(1)],
          total: 23,
          page: 1,
          totalPages: 3,
          funnel: funnel(23),
        };
      }
      rolling += 1;
      if (rolling === 1) return ninety;
      return {
        users: [{ ...clientFixture(7), displayName: "Окно 7д" }],
        total: 3,
        page: 1,
        totalPages: 1,
        funnel: funnel(23),
      };
    });

    const ui = userEvent.setup();
    render(<AdminClientsClient />);
    await screen.findByTestId("client-period");
    await ui.selectOptions(screen.getByTestId("client-period"), "90d");
    await waitFor(() => expect(rolling).toBe(1));
    await ui.selectOptions(screen.getByTestId("client-period"), "7d");
    await waitFor(() => {
      expect(screen.getByTestId("clients-kpi-period").textContent).toMatch(/3/);
      expect(screen.getAllByText("Окно 7д").length).toBeGreaterThan(0);
    });

    await act(async () => {
      resolveNinety({
        users: [{ ...clientFixture(90), displayName: "Устаревшее 90д" }],
        total: 40,
        page: 1,
        totalPages: 4,
        funnel: funnel(23),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("clients-count-hint")).toHaveTextContent("3 клиентов");
    });
    expect(screen.queryByText("Устаревшее 90д")).toBeNull();
    expect(screen.getByTestId("clients-kpi-period").textContent).toMatch(/3/);
    expect(screen.getByTestId("clients-kpi-period").textContent).toMatch(/7 дней/);
  });

  it("captures stable MSK 90d registration endpoints for list+paging without period=90d", async () => {
    fetchAdminClients.mockImplementation(async (q: { page?: number }) => ({
      users: [clientFixture(q.page === 2 ? 11 : 1)],
      total: 15,
      page: q.page ?? 1,
      totalPages: 2,
      funnel: funnel(23),
    }));
    render(<AdminClientsClient />);
    await screen.findByTestId("client-period");
    await userEvent.setup().selectOptions(screen.getByTestId("client-period"), "90d");
    await waitFor(() => {
      const last = fetchAdminClients.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(last.period).toBe("all");
      expect(last.createdFrom).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(last.createdTo).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
    const afterSelect = fetchAdminClients.mock.calls.at(-1)![0] as {
      createdFrom: string;
      createdTo: string;
    };
    await userEvent.setup().click(screen.getByRole("button", { name: "Следующая страница" }));
    await waitFor(() =>
      expect(fetchAdminClients).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
    const afterPage = fetchAdminClients.mock.calls.at(-1)![0] as {
      createdFrom: string;
      createdTo: string;
      period: string;
      page: number;
    };
    expect(afterPage.page).toBe(2);
    expect(afterPage.period).toBe("all");
    expect(afterPage.createdFrom).toBe(afterSelect.createdFrom);
    expect(afterPage.createdTo).toBe(afterSelect.createdTo);
  });

  it("exports all matching pages (23) not only the visible page of 10", async () => {
    const all = Array.from({ length: 23 }, (_, i) => clientFixture(i + 1));
    fetchAdminClients.mockImplementation(async (q: { page?: number; limit?: number }) => {
      const limit = q.limit ?? 10;
      const page = q.page ?? 1;
      const start = (page - 1) * limit;
      // List UI still uses limit 10; export collector uses up to 100.
      return {
        users: all.slice(start, start + limit),
        total: 23,
        page,
        totalPages: Math.max(1, Math.ceil(23 / limit)),
        funnel: funnel(23),
      };
    });

    const createObjectURL = vi.fn(() => "blob:qa-export");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<AdminClientsClient />);
    expect(await screen.findByTestId("clients-range")).toHaveTextContent(/1–10 из 23/);
    expect(document.querySelector('[data-admin-clients="a21j"]')).toBeTruthy();

    await userEvent.setup().click(screen.getByTestId("clients-export"));
    expect(await screen.findByTestId("clients-export-done")).toHaveTextContent(/23 записей/);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob).toBeTruthy();
    expect(blob.type).toMatch(/csv/);
    expect(blob.size).toBeGreaterThan(100);
    // Visible table stayed at limit=10; export collector uses pageLimit 100 and
    // must cover all 23 (unit tests assert CSV bytes / formula safety).
    const exportish = fetchAdminClients.mock.calls.filter((c) => {
      const arg = c[0] as { limit?: number };
      return (arg.limit ?? 10) === 100;
    });
    expect(exportish.length).toBeGreaterThan(0);
    const exportArg = exportish[0]![0] as { page?: number; limit?: number };
    expect(exportArg).toMatchObject({ page: 1, limit: 100 });
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("does not download a file when export is cancelled or fails", async () => {
    let resolveFirst: ((v: unknown) => void) | null = null;
    fetchAdminClients.mockImplementation(async (q: { page?: number; limit?: number }) => {
      if ((q.limit ?? 10) === 10) {
        return {
          users: [clientFixture(1)],
          total: 23,
          page: 1,
          totalPages: 3,
          funnel: funnel(23),
        };
      }
      return new Promise((resolve, reject) => {
        resolveFirst = resolve;
        const signal = (q as { signal?: AbortSignal }).signal;
        signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const createObjectURL = vi.fn(() => "blob:should-not");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<AdminClientsClient />);
    await screen.findByTestId("clients-export");
    await userEvent.setup().click(screen.getByTestId("clients-export"));
    expect(await screen.findByTestId("clients-export-progress")).toBeTruthy();
    await userEvent.setup().click(screen.getByTestId("clients-export-cancel"));
    expect(await screen.findByTestId("clients-export-cancelled")).toHaveTextContent(/не создан/i);
    expect(createObjectURL).not.toHaveBeenCalled();
    // Unblock any stray waiter
    resolveFirst?.({
      users: [],
      total: 23,
      page: 2,
      totalPages: 3,
      funnel: funnel(23),
    });
    vi.unstubAllGlobals();
  });

  it("opens readonly client detail drawer from the list without inventing unavailable fields", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(1)],
      total: 23,
      page: 1,
      totalPages: 3,
      funnel: funnel(23),
    });
    render(<AdminClientsClient />);
    const openers = await screen.findAllByTestId("open-client");
    await userEvent.setup().click(openers[0]!);
    expect(await screen.findByTestId("client-detail-drawer")).toHaveAttribute("open");
    expect(screen.getByTestId("client-detail-name")).toHaveTextContent("Клиент 1");
    expect(screen.getByTestId("client-detail-public-id")).toHaveTextContent("RC-C1");
    expect(screen.getByTestId("client-detail-source-gap")).toBeTruthy();
    expect(screen.getByTestId("client-detail-consent-gap")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /сохранить|удалить/i })).toBeNull();
    await userEvent.setup().click(screen.getByTestId("client-detail-close-footer"));
    await waitFor(() =>
      expect(screen.getByTestId("client-detail-drawer")).not.toHaveAttribute("open"),
    );
  });

  it("keeps publicId and city visible when name is blank or long", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [
        {
          ...clientFixture(7),
          displayName: "   ",
          city: null,
          publicId: "RC-CLIENT-USERNAME-WITH-EXTREMELY-LONG-PUBLIC-IDENTIFIER-007",
        },
        {
          ...clientFixture(8),
          displayName: "Очень длинное имя клиента для проверки переноса строки и ellipsis",
          city: "Ростов-на-Дону",
        },
      ],
      total: 23,
      page: 1,
      totalPages: 3,
      funnel: funnel(23),
    });
    render(<AdminClientsClient />);
    expect(await screen.findByTestId("clients-total")).toHaveTextContent("23");
    expect(screen.getByTestId("clients-range").textContent).toMatch(/1–2 из 23/);
    expect(screen.getByTestId("clients-count-hint").textContent).toMatch(/^23 клиентов/);
    // Blank name → em dash; city and publicId remain separate readable fields.
    const names = screen.getAllByTestId("client-name");
    expect(names.some((el) => el.textContent === "—")).toBe(true);
    expect(
      screen
        .getAllByTestId("client-public-id")
        .some((el) => el.textContent?.includes("RC-CLIENT-USERNAME-WITH-EXTREMELY-LONG")),
    ).toBe(true);
    expect(screen.getAllByTestId("client-city").some((el) => el.textContent === "—")).toBe(true);
    expect(screen.getAllByTestId("client-city").some((el) => el.textContent === "Ростов-на-Дону")).toBe(
      true,
    );
    for (const el of screen.getAllByTestId("clients-source-gap")) {
      expect(el.textContent).toBe("—");
    }
    for (const el of screen.getAllByTestId("clients-stage-gap")) {
      expect(el.textContent).toBe("—");
    }
  });
});
