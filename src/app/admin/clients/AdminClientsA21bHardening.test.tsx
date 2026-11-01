import { act, render, screen, waitFor } from "@testing-library/react";
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

const longName =
  "Александра-Виктория Константинопольская-Оченьдлиннаяфамилия username_with_very_long_identifier@example.invalid";

function client(n: number, extra: Partial<{ displayName: string; publicId: string }> = {}) {
  return {
    id: `c-${n}`,
    publicId: extra.publicId ?? `RC-C${n}`,
    displayName: extra.displayName ?? `Клиент ${n}`,
    role: "CLIENT" as const,
    city: "Краснодар",
    photoUrl: null,
    clientAvatarUrl: null,
    isBlocked: false,
    createdAt: "2025-03-15T00:00:00.000Z",
  };
}

describe("A21b clients hardening", () => {
  beforeEach(() => {
    fetchAdminClients.mockReset();
  });

  it("keeps BE total when page has fewer items than total", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [client(1)],
      total: 42,
      page: 1,
      totalPages: 5,
    });
    render(<AdminClientsClient />);
    expect(await screen.findByTestId("clients-total")).toHaveTextContent("42");
    expect(screen.getByTestId("clients-count-hint")).toHaveTextContent("42 клиентов");
    expect(screen.getByTestId("clients-range").textContent).toMatch(/из 42/);
  });

  it("shows 0 for null/empty totals without using items.length as base", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });
    render(<AdminClientsClient />);
    expect(await screen.findByTestId("clients-empty")).toBeTruthy();
    expect(screen.getByTestId("clients-total")).toHaveTextContent("0");
  });

  it("ignores delayed stale responses when search changes quickly", async () => {
    let resolveFirst!: (v: unknown) => void;
    const first = new Promise((r) => {
      resolveFirst = r;
    });
    fetchAdminClients
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce({
        users: [client(9, { displayName: "Анна" })],
        total: 1,
        page: 1,
        totalPages: 1,
      });

    const ui = userEvent.setup();
    render(<AdminClientsClient />);
    await ui.type(screen.getByTestId("client-search"), "анна");
    await waitFor(() => expect(fetchAdminClients.mock.calls.length).toBeGreaterThanOrEqual(2));

    await act(async () => {
      resolveFirst({
        users: [client(1, { displayName: "Устаревший" })],
        total: 99,
        page: 1,
        totalPages: 10,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("clients-total")).toHaveTextContent("1");
    });
    expect(screen.queryByText("Устаревший")).toBeNull();
    expect(screen.getAllByText("Анна").length).toBeGreaterThan(0);
  });

  it("renders long displayName/publicId without create/delete actions", async () => {
    fetchAdminClients.mockResolvedValue({
      users: [
        client(1, {
          displayName: longName,
          publicId: "RC-CLIENT-USERNAME-WITH-EXTREMELY-LONG-PUBLIC-IDENTIFIER-001",
        }),
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    const { container } = render(<AdminClientsClient />);
    expect((await screen.findAllByText(longName)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /создать|удалить|изменить/i })).toBeNull();
    expect(container.querySelector('[data-admin-clients="a21b"]')).toBeTruthy();
  });

  it("surfaces 401 and 403 distinctly with retry after error", async () => {
    fetchAdminClients.mockRejectedValueOnce(new RemcardApiError(401, "unauthorized"));
    const view = render(<AdminClientsClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Сессия недействительна/);
    view.unmount();

    fetchAdminClients.mockRejectedValueOnce(new RemcardApiError(403, "forbidden"));
    render(<AdminClientsClient />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/Недостаточно прав/);
  });
});
