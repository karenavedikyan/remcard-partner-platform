import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppMaxEntry } from "./MiniAppMaxEntry";
import * as api from "@/lib/mini-app/api";

vi.mock("@/lib/mini-app/api", () => ({
  miniAppSendLoginCode: vi.fn(),
  miniAppVerifyLoginCode: vi.fn(),
}));

describe("MiniAppMaxEntry", () => {
  it("renders prototype landing copy", () => {
    render(
      <MiniAppMaxEntry
        platform="max"
        initData="fixture-init"
        embeddedContext="cross_site_iframe"
        profLoginUrl="/login"
        profRegisterUrl="/join"
        onAuthenticated={() => undefined}
        onOpenExternal={() => undefined}
      />,
    );
    expect(screen.getByText("Вход через MAX")).toBeInTheDocument();
    expect(screen.getByText("Войдите в кабинет")).toBeInTheDocument();
    expect(screen.getByText("ТРИ ШАГА")).toBeInTheDocument();
    expect(screen.getByTestId("mini-app-max-continue")).toHaveTextContent("Продолжить с MAX");
    expect(screen.getByText("Зарегистрироваться")).toBeInTheDocument();
  });

  it("requests login code on continue", async () => {
    const user = userEvent.setup();
    vi.mocked(api.miniAppSendLoginCode).mockResolvedValue({
      status: "ok",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      resendAfterSec: 30,
    });
    const onAuth = vi.fn();
    render(
      <MiniAppMaxEntry
        platform="max"
        initData="fixture-init"
        embeddedContext="cross_site_iframe"
        profLoginUrl="/login"
        profRegisterUrl="/join"
        onAuthenticated={onAuth}
        onOpenExternal={() => undefined}
      />,
    );
    await user.click(screen.getByTestId("mini-app-max-continue"));
    expect(api.miniAppSendLoginCode).toHaveBeenCalledWith("max", "fixture-init", {
      embeddedContext: "cross_site_iframe",
    });
    expect(screen.getByTestId("mini-app-max-code")).toBeInTheDocument();
  });
});