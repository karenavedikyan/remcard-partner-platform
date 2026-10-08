import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationSettingsPanel } from "./NotificationSettingsPanel";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

import { remcardFetch } from "@/lib/api-client";

describe("NotificationSettingsPanel", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("shows connect buttons when messengers are not linked", () => {
    render(
      <NotificationSettingsPanel
        telegramLinked={false}
        maxLinked={false}
        initialSettings={{ channels: [], channelsExplicit: false }}
      />,
    );
    expect(screen.getByRole("button", { name: /Подключить Telegram/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Подключить MAX/i })).toBeInTheDocument();
  });

  it("starts bind flow via API", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      deepLink: "https://t.me/bot?start=nbind_x",
      startPayload: "nbind_x",
      hint: "Откройте бота",
    });
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <NotificationSettingsPanel
        telegramLinked={false}
        maxLinked={false}
        initialSettings={null}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Подключить Telegram/i }));
    expect(remcardFetch).toHaveBeenCalledWith("/api/pro/notification-bind/start", {
      method: "POST",
      body: { provider: "TELEGRAM" },
    });
    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
