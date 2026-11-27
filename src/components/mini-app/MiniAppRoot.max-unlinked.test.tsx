import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppRoot } from "./MiniAppRoot";
import * as bridgeLoader from "@/lib/mini-app/bridge-loader";
import * as host from "@/lib/mini-app/host";
import * as api from "@/lib/mini-app/api";

vi.mock("@/lib/mini-app/bridge-loader");
vi.mock("@/lib/mini-app/host");
vi.mock("@/lib/mini-app/api");

describe("MiniAppRoot MAX unlinked", () => {
  beforeEach(() => {
    vi.mocked(bridgeLoader.ensureMiniAppBridgeReady).mockResolvedValue({
      platform: "max",
      bridgeError: null,
    });
    vi.mocked(host.detectMiniAppHost).mockReturnValue({
      platform: "max",
      initData: "init",
      ready: vi.fn(),
      expand: vi.fn(),
      onBack: vi.fn(),
      offBack: vi.fn(),
      shareText: vi.fn(() => false),
      openExternalLink: vi.fn(),
      copyToClipboard: vi.fn(async () => true),
    });
    vi.mocked(api.miniAppExchangeSession).mockResolvedValue({
      status: "unlinked",
      message: "Нет привязки MAX",
      profLoginUrl: "/login?x=1",
    });
  });

  afterEach(() => vi.resetAllMocks());

  it("shows structured onboarding, not OTP, until user chooses code login", async () => {
    const user = userEvent.setup();
    render(<MiniAppRoot />);
    await waitFor(() => {
      expect(screen.getByTestId("mini-app-max-unlinked")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("mini-app-max-continue")).not.toBeInTheDocument();
    await user.click(screen.getByTestId("mini-app-login-by-code"));
    await waitFor(() => {
      expect(screen.getByTestId("mini-app-max-entry")).toBeInTheDocument();
    });
  });
});