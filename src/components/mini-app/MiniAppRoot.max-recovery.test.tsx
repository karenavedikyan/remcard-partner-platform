import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppRoot } from "./MiniAppRoot";
import * as bridgeLoader from "@/lib/mini-app/bridge-loader";
import * as host from "@/lib/mini-app/host";
import * as api from "@/lib/mini-app/api";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/mini-app/bridge-loader");
vi.mock("@/lib/mini-app/host");
vi.mock("@/lib/mini-app/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mini-app/api")>();
  return {
    ...actual,
    miniAppExchangeSession: vi.fn(),
    miniAppFetchBootstrap: vi.fn(),
  };
});

describe("MiniAppRoot MAX recovery", () => {
  const hostStub = {
    platform: "max" as const,
    initData: "signed-max",
    ready: vi.fn(),
    expand: vi.fn(),
    onBack: vi.fn(),
    offBack: vi.fn(),
    shareText: vi.fn(() => false),
    openExternalLink: vi.fn(),
    copyToClipboard: vi.fn(async () => true),
  };

  beforeEach(() => {
    vi.mocked(bridgeLoader.ensureMiniAppBridgeReady).mockResolvedValue({
      platform: "max",
      bridgeError: null,
    });
    vi.mocked(host.detectMiniAppHost).mockReturnValue(hostStub);
  });

  afterEach(() => vi.resetAllMocks());

  it("offers login-by-code after session ok but bootstrap transport failure", async () => {
    vi.mocked(api.miniAppExchangeSession).mockResolvedValue({ status: "ok", platform: "max" });
    vi.mocked(api.miniAppFetchBootstrap).mockRejectedValue(
      new RemcardApiError(401, "Вход мини-приложения не подтверждён", {
        code: "MINI_SESSION_MISSING",
      }),
    );
    render(<MiniAppRoot />);
    await waitFor(() => {
      expect(screen.getByTestId("mini-app-max-recovery")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mini-app-login-by-code")).toBeInTheDocument();
  });

  it("shows launch-invalid screen without OTP", async () => {
    vi.mocked(api.miniAppExchangeSession).mockResolvedValue({
      status: "launch_invalid",
      message: "Срок входа истёк. Закройте и снова откройте мини-приложение.",
    });
    render(<MiniAppRoot />);
    await waitFor(() => {
      expect(screen.getByTestId("mini-app-launch-invalid")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("mini-app-login-by-code")).not.toBeInTheDocument();
  });
});