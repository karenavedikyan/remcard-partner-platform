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

describe("AdminClientsClient", () => {
  beforeEach(() => {
    fetchAdminClients.mockReset();
  });

  it("renders readonly cards/table, search, period, pagination without mutations", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(1), clientFixture(2)],
      total: 12,
      page: 1,
      totalPages: 2,
    });
    render(<AdminClientsClient />);
    await screen.findByRole("heading", { name: "Клиенты", level: 1 });
    expect((await screen.findAllByText("Клиент 1")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("clients-total").textContent).toBe("12");
    expect(screen.getByTestId("clients-range").textContent).toMatch(/1–2 из 12/);
    expect(screen.queryByRole("button", { name: /создать|удалить|редактир/i })).toBeNull();

    await userEvent.setup().click(screen.getByRole("button", { name: "Таблица" }));
    expect(screen.getByTestId("clients-table")).toBeTruthy();

    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(1)],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    fireEvent.change(screen.getByTestId("client-search"), { target: { value: "Клиент 1" } });
    await waitFor(() => {
      const last = fetchAdminClients.mock.calls.at(-1)![0] as Record<string, unknown>;
      expect(last).toMatchObject({ search: "Клиент 1", page: 1, limit: 10, period: "all" });
    });
  });

  it("shows empty, error+retry states", async () => {
    fetchAdminClients.mockResolvedValue({ users: [], total: 0, page: 1, totalPages: 1 });
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
    });
    render(<AdminClientsClient />);
    expect((await screen.findAllByText("Клиент 1")).length).toBeGreaterThan(0);
    expect(screen.getByTestId("clients-range").textContent).toMatch(/1–1 из 15/);
    fetchAdminClients.mockResolvedValue({
      users: [clientFixture(11)],
      total: 15,
      page: 2,
      totalPages: 2,
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Следующая страница" }));
    await waitFor(() =>
      expect(fetchAdminClients).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
    expect((await screen.findAllByText("Клиент 11")).length).toBeGreaterThan(0);
  });
});
