import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByTestId("clients-period-gap").textContent).toMatch(/90 дней пока недоступно/);
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

  it("applies live registration periods without inventing 7/30/90 filters", async () => {
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
    expect(last.period).not.toMatch(/7|30|90/);
    expect(screen.getByTestId("clients-help").textContent).toMatch(/Источник рекомендации/);
    expect(screen.getByTestId("clients-help").textContent).toMatch(/этап сделки/);
    expect(screen.getByTestId("clients-help").textContent).not.toMatch(/search<\/code>|GET \/api/);
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
