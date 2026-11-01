/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";

const api = vi.hoisted(() => ({
  fetchAdminTeam: vi.fn(),
}));

vi.mock("@/lib/prof-admin-team-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prof-admin-team-api")>(
    "@/lib/prof-admin-team-api",
  );
  return {
    ...actual,
    fetchAdminTeam: api.fetchAdminTeam,
  };
});

import { AdminTeamClient } from "./AdminTeamClient";

const members = [
  {
    id: "owner-1",
    publicId: "RC-OWN",
    displayName: "Владимир Владелец",
    staffRole: "OWNER" as const,
    staffAvatarUrl: null,
    staffPosition: null,
    staffTelegram: null,
    staffBio: null,
    staffStartDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "admin-1",
    publicId: "RC-ADM",
    displayName: "Анна Админ",
    staffRole: "ADMIN" as const,
    staffAvatarUrl: null,
    staffPosition: null,
    staffTelegram: null,
    staffBio: null,
    staffStartDate: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAdminTeam.mockResolvedValue({ members });
});

describe("AdminTeamClient A17d strict response", () => {
  it("malformed list response shows recoverable error without false empty or zero KPI", async () => {
    api.fetchAdminTeam
      .mockRejectedValueOnce(new Error("Не удалось загрузить команду"))
      .mockResolvedValueOnce({ members });
    render(<AdminTeamClient />);
    expect(await screen.findByText("Не удалось загрузить команду")).toBeTruthy();
    expect(screen.queryByText(/В команде пока никого нет/i)).toBeNull();
    expect(screen.getByTestId("team-kpi-active").querySelector("strong")?.textContent).toBe("—");
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await screen.findByText("Анна Админ");
    expect(screen.getByTestId("team-kpi-active").querySelector("strong")?.textContent).toBe("2");
  });

  it("genuine empty members stays empty state (not error)", async () => {
    api.fetchAdminTeam.mockResolvedValueOnce({ members: [] });
    render(<AdminTeamClient />);
    expect(await screen.findByText(/В команде пока никого нет/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Повторить" })).toBeNull();
    expect(screen.getByTestId("team-kpi-active").querySelector("strong")?.textContent).toBe("0");
  });
});

describe("AdminTeamClient A17c R1 cards/KPI", () => {
  it("shows R1 role legend from loaded roles including analyst without inventing closed count", async () => {
    api.fetchAdminTeam.mockResolvedValueOnce({
      members: [
        ...members,
        {
          ...members[1],
          id: "analyst-1",
          publicId: "RC-ANL",
          displayName: "Ирина Аналитик",
          staffRole: "ANALYST",
        },
      ],
    });
    render(<AdminTeamClient />);
    await screen.findByText("Ирина Аналитик");
    expect(screen.getByTestId("team-kpi-roles")).toHaveTextContent(
      "Владелец · Администратор · Аналитик",
    );
    expect(screen.getByTestId("team-kpi-active")).toHaveTextContent("Доступ активен");
    expect(screen.getByTestId("team-kpi-closed").querySelector("strong")?.textContent).toBe("—");
    expect(screen.queryByText(/StaffRole/)).toBeNull();
    expect(screen.getByText("Данные о закрытых доступах пока недоступны")).toBeTruthy();
    expect(screen.queryByText(/GET \/api\/admin\/team/i)).toBeNull();
  });

  it("renders frozen R1 card note and routes access to existing screen", async () => {
    render(<AdminTeamClient />);
    expect(await screen.findByRole("heading", { name: "Команда", level: 1 })).toBeTruthy();
    expect(screen.getByText("Люди, направления и доступ")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Управление доступом" })).toHaveAttribute(
      "href",
      "/admin/access/users",
    );
    const cards = await screen.findByRole("list", { name: "Карточки сотрудников" });
    expect(within(cards).getByText("Владимир Владелец")).toBeTruthy();
    expect(within(cards).getByText("Анна Админ")).toBeTruthy();
    expect(
      within(cards).getAllByText("Роль задаётся приглашением, без привязки к направлению").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: /Все права: управление доступом для Владимир/i }),
    ).toHaveAttribute("href", "/admin/access/users");
    expect(
      screen.getByRole("link", { name: /Доступ: управление доступом для Анна/i }),
    ).toHaveAttribute("href", "/admin/access/users");
    expect(screen.queryByRole("button", { name: /Удалить|Отозвать|Назначить роль/i })).toBeNull();
    expect(screen.getByText(/только для просмотра/i)).toBeTruthy();
  });

  it("searches loaded data and toggles list view", async () => {
    render(<AdminTeamClient />);
    await screen.findByText("Анна Админ");
    fireEvent.change(screen.getByLabelText("Поиск по команде"), { target: { value: "анна" } });
    expect(screen.getByText("Анна Админ")).toBeTruthy();
    expect(screen.queryByText("Владимир Владелец")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Список" }));
    expect(await screen.findByRole("list", { name: "Список сотрудников" })).toBeTruthy();
    expect(screen.getByText("RC-ADM")).toBeTruthy();
  });

  it("shows empty, error/retry, forbidden and unauthorized states", async () => {
    api.fetchAdminTeam.mockResolvedValueOnce({ members: [] });
    const { unmount } = render(<AdminTeamClient />);
    expect(await screen.findByText(/В команде пока никого нет/i)).toBeTruthy();
    unmount();

    api.fetchAdminTeam
      .mockRejectedValueOnce(new RemcardApiError(500, "boom", null))
      .mockResolvedValueOnce({ members });
    render(<AdminTeamClient />);
    expect(await screen.findByRole("button", { name: "Повторить" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(screen.getByText("Анна Админ")).toBeTruthy());
  });

  it("surfaces forbidden and unauthorized without inventing write controls", async () => {
    api.fetchAdminTeam.mockRejectedValueOnce(new RemcardApiError(403, "Forbidden", null));
    const { unmount } = render(<AdminTeamClient />);
    expect(await screen.findByText(/Недостаточно прав/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Повторить" })).toBeNull();
    unmount();

    api.fetchAdminTeam.mockRejectedValueOnce(new RemcardApiError(401, "Unauthorized", null));
    render(<AdminTeamClient />);
    expect(await screen.findByRole("link", { name: "Войти снова" })).toHaveAttribute(
      "href",
      "/login?mode=admin&returnTo=/admin/team",
    );
  });
});
