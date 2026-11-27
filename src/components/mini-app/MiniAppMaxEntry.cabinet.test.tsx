import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppMaxEntry } from "./MiniAppMaxEntry";
import * as api from "@/lib/mini-app/api";

vi.mock("@/lib/mini-app/api");

describe("MiniAppMaxEntry cabinet_blocked", () => {
  it("routes to parent onboarding screen instead of raw Forbidden", async () => {
    const user = userEvent.setup();
    vi.mocked(api.miniAppSendLoginCode).mockResolvedValue({
      status: "ok",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      resendAfterSec: 30,
    });
    vi.mocked(api.miniAppVerifyLoginCode).mockResolvedValue({
      status: "cabinet_blocked",
      message: "Примите обязательные согласия на сайте PROF.",
      nextStep: "consents",
    });
    const onBlocked = vi.fn();
    render(
      <MiniAppMaxEntry
        platform="max"
        initData="init"
        embeddedContext="cross_site_iframe"
        profLoginUrl="/login"
        profRegisterUrl="/join"
        onAuthenticated={() => undefined}
        onOpenExternal={() => undefined}
        onCabinetBlocked={onBlocked}
      />,
    );
    await user.click(screen.getByTestId("mini-app-max-continue"));
    fireEvent.change(screen.getByLabelText("Код из MAX"), { target: { value: "123456" } });
    await user.click(screen.getByRole("button", { name: "Войти в кабинет" }));
    expect(onBlocked).toHaveBeenCalledWith({
      message: "Примите обязательные согласия на сайте PROF.",
      nextStep: "consents",
    });
  });
});