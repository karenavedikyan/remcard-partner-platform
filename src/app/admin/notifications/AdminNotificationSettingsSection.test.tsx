import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RemcardApiError } from "@/lib/api-client";

const api = vi.hoisted(() => ({
  fetchAdminNotificationSettings: vi.fn(),
  patchAdminNotificationSettings: vi.fn(),
  fetchAdminNotificationBindStatus: vi.fn(),
  startAdminNotificationBind: vi.fn(),
}));

vi.mock("@/lib/prof-admin-notifications-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prof-admin-notifications-api")>();
  return {
    ...actual,
    fetchAdminNotificationSettings: api.fetchAdminNotificationSettings,
    patchAdminNotificationSettings: api.patchAdminNotificationSettings,
    fetchAdminNotificationBindStatus: api.fetchAdminNotificationBindStatus,
    startAdminNotificationBind: api.startAdminNotificationBind,
  };
});

import { AdminNotificationSettingsSection } from "./AdminNotificationSettingsSection";

const settingsPayload = {
  settings: {
    newClients: true,
    newPartners: true,
    partnerActivity: true,
    channels: [] as ("telegram" | "max")[],
    activityFrequency: "daily" as const,
  },
  bindings: { telegramLinked: false, maxLinked: false },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAdminNotificationSettings.mockResolvedValue(settingsPayload);
});

describe("AdminNotificationSettingsSection binding (CLIENT-role staff admin)", () => {
  it("loads settings only on mount without automatic bind start", async () => {
    render(<AdminNotificationSettingsSection />);
    await screen.findByText("Настройки уведомлений");
    expect(api.fetchAdminNotificationSettings).toHaveBeenCalledTimes(1);
    expect(api.startAdminNotificationBind).not.toHaveBeenCalled();
    expect(api.fetchAdminNotificationBindStatus).not.toHaveBeenCalled();
  });

  it("disables channel toggles until binding and calls admin bind API on user click", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);
    api.startAdminNotificationBind.mockResolvedValue({
      deepLink: "https://t.me/RemCardBot?start=nbind_admin_tok",
      startPayload: "nbind_admin_tok",
      hint: "Подтвердите в Telegram",
    });
    const ui = userEvent.setup();
    render(<AdminNotificationSettingsSection />);
    await screen.findByText("Настройки уведомлений");
    expect(screen.getByRole("checkbox", { name: /Telegram/i })).toBeDisabled();
    await ui.click(screen.getByRole("button", { name: "Привязать Telegram" }));
    await waitFor(() =>
      expect(api.startAdminNotificationBind).toHaveBeenCalledWith("TELEGRAM"),
    );
    expect(openSpy).toHaveBeenCalledWith(
      "https://t.me/RemCardBot?start=nbind_admin_tok",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("refresh bindings uses admin status endpoint and surfaces errors", async () => {
    api.fetchAdminNotificationBindStatus.mockRejectedValueOnce(
      new RemcardApiError(502, "bind status down", null),
    );
    const ui = userEvent.setup();
    render(<AdminNotificationSettingsSection />);
    await screen.findByText("Настройки уведомлений");
    await ui.click(screen.getByRole("button", { name: "Обновить привязку" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("bind status down");
  });

  it("reviewer: permits disabling a previously enabled channel whose new delivery binding is absent", async () => {
    const settings = {
      newClients: true,
      newPartners: true,
      partnerActivity: true,
      channels: ["max" as const],
      activityFrequency: "daily" as const,
    };
    const bindings = { telegramLinked: false, maxLinked: false };
    api.fetchAdminNotificationSettings.mockResolvedValue({ settings, bindings });
    api.patchAdminNotificationSettings.mockResolvedValue({
      settings: { ...settings, channels: [] },
      bindings,
    });
    const user = userEvent.setup();
    render(<AdminNotificationSettingsSection />);
    const max = await screen.findByRole("checkbox", { name: /MAX/ });
    expect(max).toBeChecked();
    await user.click(max);
    expect(max).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() =>
      expect(api.patchAdminNotificationSettings).toHaveBeenCalledWith(
        expect.objectContaining({ channels: [] }),
      ),
    );
  });

  it("does not link to partner profile notification settings", async () => {
    render(<AdminNotificationSettingsSection />);
    await screen.findByText("Настройки уведомлений");
    expect(screen.queryByRole("link", { name: /настройки партн/i })).toBeNull();
    expect(document.body.textContent).not.toMatch(/\/profile/);
  });
});
