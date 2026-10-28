import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";
import { AdminPartnersClient } from "./AdminPartnersClient";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));
vi.mock("@/lib/prof-admin-partners-api", () => api);

const demoAdminVisible = {
  id: "demo-show",
  displayName: "Legacy Demo Visible",
  partnerType: "MASTER",
  registrationLabel: "DEMO" as const,
  catalogVisibility: "VISIBLE" as const,
  city: "SPB",
  lifecycle: null,
  partnerSearchVisibility: {
    visible: true,
    reasonCode: "admin_show",
    reasonLabel: "",
    adminOverride: "SHOW" as const,
  },
  partnershipCounts: { active: 0, invited: 0, pending: 0, paused: 0, ended: 0, total: 0 },
};

const demoHiddenAuto = {
  id: "demo-hidden",
  displayName: "Demo Hidden Search",
  partnerType: "MASTER",
  registrationLabel: "DEMO" as const,
  catalogVisibility: "VISIBLE" as const,
  city: "SPB",
  lifecycle: null,
  partnerSearchVisibility: {
    visible: false,
    reasonCode: "demo_account",
    reasonLabel: "Демо-аккаунт",
    adminOverride: "AUTO" as const,
  },
  partnershipCounts: { active: 0, invited: 0, pending: 0, paused: 0, ended: 0, total: 0 },
};

const archivedBlocked = {
  id: "archived",
  displayName: "Archived Partner",
  partnerType: "STORE",
  registrationLabel: "ACTIVE" as const,
  city: "Kazan",
  lifecycle: { catalogHiddenAt: null, projectArchivedAt: "2026-10-01" },
  partnerSearchVisibility: {
    visible: false,
    reasonCode: "project_archived",
    reasonLabel: "Профиль в архиве",
    adminOverride: "AUTO" as const,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
  api.fetchPartnerRegistry.mockResolvedValue({
    items: [demoAdminVisible, archivedBlocked],
    total: 2,
    nextCursor: null,
    facets: null,
  });
  api.previewPartnerLifecycle.mockResolvedValue({
    preview: { effects: ["Будет показан в поиске"], warnings: [], confirmToken: "tok-show" },
  });
  api.applyPartnerLifecycle.mockResolvedValue({ ok: true });
});

async function openManagement(name: string) {
  render(<AdminPartnersClient />);
  await screen.findByText(name);
  const row = screen.getByText(name).closest("tr") ?? screen.getByText(name).closest("article");
  const deleteBtn = within(row!).getByRole("button", { name: "Удалить" });
  fireEvent.click(deleteBtn);
  return screen.getByRole("region", { name: new RegExp(name) });
}

describe("Admin partner search visibility controls", () => {
  it("shows search actions in table management panel with demo badge unchanged", async () => {
    const panel = await openManagement("Legacy Demo Visible");
    expect(within(panel).getByRole("button", { name: "Показывать партнёрам" })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "Скрыть от партнёров" })).toBeTruthy();
    expect(within(panel).getByRole("button", { name: "По правилам регистрации" })).toBeTruthy();
    expect(screen.getAllByText("Демо").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Виден партнёрам по решению администратора").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Виден в каталоге").length).toBeGreaterThan(0);
  });

  it("runs preview and apply for hide_partner_search without manual reason and sends auto audit text", async () => {
    const panel = await openManagement("Legacy Demo Visible");
    fireEvent.click(within(panel).getByRole("button", { name: "Скрыть от партнёров" }));
    await waitFor(() =>
      expect(api.previewPartnerLifecycle).toHaveBeenCalledWith("demo-show", "hide_partner_search"),
    );
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() =>
      expect(api.applyPartnerLifecycle).toHaveBeenCalledWith(
        "demo-show",
        "hide_partner_search",
        "Администратор выбрал скрытие партнёра от поиска сотрудничества",
        "tok-show",
      ),
    );
    expect(api.fetchPartnerRegistry.mock.calls.length).toBeGreaterThan(1);
  });

  it("does not call apply when search preview is cancelled", async () => {
    const panel = await openManagement("Legacy Demo Visible");
    fireEvent.click(within(panel).getByRole("button", { name: "Скрыть от партнёров" }));
    await screen.findByRole("button", { name: "Подтвердить" });
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
    expect(within(panel).getByRole("button", { name: "Скрыть от партнёров" })).toBeTruthy();
  });

  it("still requires manual reason before catalog hide preview", async () => {
    const panel = await openManagement("Legacy Demo Visible");
    fireEvent.click(within(panel).getByRole("button", { name: "Убрать из каталога" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Укажите причину");
    expect(api.previewPartnerLifecycle).not.toHaveBeenCalled();
  });

  it("disables show for hard-gated archived partner without calling preview", async () => {
    const panel = await openManagement("Archived Partner");
    expect(within(panel).getByRole("button", { name: "Показывать партнёрам" })).toBeDisabled();
    expect(api.previewPartnerLifecycle).not.toHaveBeenCalled();
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
  });

  it("exposes the same controls in cards view", async () => {
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Legacy Demo Visible");
    await ui.click(screen.getByRole("button", { name: "Карточки" }));
    await ui.click(screen.getAllByRole("button", { name: "Действия" })[0]!);
    const panel = screen.getByRole("region", { name: /Legacy Demo Visible/ });
    expect(within(panel).getByRole("button", { name: "Показывать партнёрам" })).toBeTruthy();
  });

  it("keeps apply rejection visible after registry reload and busy state settles", async () => {
    api.fetchPartnerRegistry.mockResolvedValue({
      items: [demoHiddenAuto],
      total: 1,
      nextCursor: null,
      facets: null,
    });
    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        action: "show_partner_search",
        effects: ["Партнёр будет показан в поиске сотрудничества"],
        warnings: [],
        confirmToken: "token",
      },
    });
    api.applyPartnerLifecycle.mockRejectedValue(new Error("Профиль был архивирован"));

    render(<AdminPartnersClient />);
    await screen.findByRole("table", { name: "Реестр партнёров" });
    const nameCell = await screen.findByText("Demo Hidden Search", { selector: "td" });
    const row = nameCell.closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Действия" }));
    const panel = screen.getByRole("region", { name: /Demo Hidden Search/ });
    fireEvent.click(within(panel).getByRole("button", { name: "Показывать партнёрам" }));
    await screen.findByRole("button", { name: "Подтвердить" });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

    await waitFor(() => expect(api.applyPartnerLifecycle).toHaveBeenCalled());
    expect(api.applyPartnerLifecycle).toHaveBeenCalledWith(
      "demo-hidden",
      "show_partner_search",
      "Администратор выбрал показ партнёра в поиске сотрудничества",
      "token",
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Подтвердить" })).toBeEnabled();
    });
    await waitFor(() => {
      expect(screen.queryByText("Загрузка…")).toBeNull();
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Профиль был архивирован");
    expect(screen.queryByText("Профиль был архивирован")).not.toBeNull();
    expect(within(panel).getByText("Решение администратора").nextElementSibling).toHaveTextContent(
      "По правилам регистрации",
    );
    expect(screen.queryByText("Виден партнёрам по решению администратора")).toBeNull();
  });

  it("clears a stale apply error after a successful retry", async () => {
    const updatedRow = {
      ...demoHiddenAuto,
      partnerSearchVisibility: {
        visible: true,
        reasonCode: "admin_show",
        reasonLabel: "",
        adminOverride: "SHOW" as const,
      },
    };
    let registryFetch = 0;
    api.fetchPartnerRegistry.mockImplementation(async () => {
      registryFetch += 1;
      return {
        items: registryFetch === 1 ? [demoHiddenAuto] : [updatedRow],
        total: 1,
        nextCursor: null,
        facets: null,
      };
    });
    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        action: "show_partner_search",
        effects: ["Показ в поиске"],
        warnings: [],
        confirmToken: "token",
      },
    });
    api.applyPartnerLifecycle
      .mockRejectedValueOnce(new Error("Профиль был архивирован"))
      .mockResolvedValueOnce({ ok: true });

    render(<AdminPartnersClient />);
    await screen.findByRole("table", { name: "Реестр партнёров" });
    const nameCell = await screen.findByText("Demo Hidden Search", { selector: "td" });
    const row = nameCell.closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: "Действия" }));
    const panel = screen.getByRole("region", { name: /Demo Hidden Search/ });
    fireEvent.click(within(panel).getByRole("button", { name: "Показывать партнёрам" }));
    await screen.findByRole("button", { name: "Подтвердить" });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Профиль был архивирован"));

    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() => expect(api.applyPartnerLifecycle).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
    await waitFor(() => {
      expect(screen.getByText("Виден партнёрам по решению администратора")).toBeTruthy();
    });
  });

  it("does not add partner search actions to bulk lifecycle map", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Legacy Demo Visible");
    fireEvent.click(screen.getByRole("checkbox", { name: /Legacy Demo Visible/i }));
    expect(screen.queryByRole("option", { name: /Показывать партнёрам/i })).toBeNull();
    expect(screen.getByLabelText("Групповое действие")).toBeTruthy();
  });
});
