import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppRoot } from "./MiniAppRoot";
import * as bridgeLoader from "@/lib/mini-app/bridge-loader";
import * as host from "@/lib/mini-app/host";
import * as api from "@/lib/mini-app/api";

vi.mock("@/lib/mini-app/bridge-loader");
vi.mock("@/lib/mini-app/host");
vi.mock("@/lib/mini-app/api");

describe("MiniAppRoot MAX OTP", () => {
  beforeEach(() => {
    vi.mocked(bridgeLoader.ensureMiniAppBridgeReady).mockResolvedValue({
      platform: "max",
      bridgeError: null,
    });
    vi.mocked(host.detectMiniAppHost).mockReturnValue({
      platform: "max",
      initData: "signed-max-init",
      ready: vi.fn(),
      expand: vi.fn(),
      onBack: vi.fn(),
      offBack: vi.fn(),
      shareText: vi.fn(() => false),
      openExternalLink: vi.fn(),
      copyToClipboard: vi.fn(async () => true),
    });
    vi.mocked(api.miniAppExchangeSession).mockResolvedValue({
      status: "session_missing",
      message: "Вход мини-приложения не подтверждён",
      retryable: true,
    });
    vi.mocked(api.miniAppSendLoginCode).mockResolvedValue({
      status: "ok",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      resendAfterSec: 30,
    });
    vi.mocked(api.miniAppVerifyLoginCode).mockResolvedValue({ status: "ok", platform: "max" });
    vi.mocked(api.miniAppFetchBootstrap).mockResolvedValue({
      role: "specialist",
      roleLabel: "Специалист",
      platform: "max",
      displayName: "Test",
      entityLine: null,
      cabinetTitle: "Кабинет специалиста",
      workplaceLabel: null,
      actions: [],
      branches: [],
      activeBranchId: null,
      workplaceForbidden: false,
      workplaceForbiddenMessage: null,
      actorUserId: "test-user",
      wallet: { status: "ok", confirmedUnpaidRub: 0, awaitingRub: 0, loadError: false },
      presentation: { cardIdentifier: null, historyHref: "/settlements", cardExplainer: "" },
      fullCabinetUrl: "https://prof.remcard.ru/",
      partnersUrl: "https://prof.remcard.ru/partners",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("recovery → OTP verify loads bootstrap without repeating session exchange", async () => {
    const user = userEvent.setup();
    render(<MiniAppRoot />);

    await waitFor(() => {
      expect(screen.getByTestId("mini-app-max-recovery")).toBeInTheDocument();
    });

    const exchangesBeforeOtp = vi.mocked(api.miniAppExchangeSession).mock.calls.length;
    expect(exchangesBeforeOtp).toBeGreaterThan(0);

    await user.click(screen.getByTestId("mini-app-login-by-code"));
    await user.click(screen.getByTestId("mini-app-max-continue"));

    const codeInput = await screen.findByLabelText("Код из MAX");
    fireEvent.change(codeInput, { target: { value: "123456" } });
    await user.click(screen.getByRole("button", { name: "Войти в кабинет" }));

    await waitFor(() => {
      expect(screen.getByTestId("mini-app-home")).toBeInTheDocument();
    });

    expect(api.miniAppVerifyLoginCode).toHaveBeenCalled();
    expect(api.miniAppFetchBootstrap).toHaveBeenCalled();
    expect(api.miniAppExchangeSession.mock.calls.length).toBe(exchangesBeforeOtp);
  });
});