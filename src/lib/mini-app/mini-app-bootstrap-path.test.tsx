import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MiniAppRoot } from "@/components/mini-app/MiniAppRoot";
import * as bridgeLoader from "./bridge-loader";
import * as host from "./host";
import * as api from "./api";

vi.mock("./bridge-loader");
vi.mock("./host");
vi.mock("./api");

describe("/mini-app bootstrap path", () => {
  beforeEach(() => {
    vi.mocked(bridgeLoader.ensureMiniAppBridgeReady).mockResolvedValue({
      platform: "telegram",
      bridgeError: null,
    });
    vi.mocked(host.detectMiniAppHost).mockReturnValue({
      platform: "telegram",
      initData: "signed-init",
      ready: vi.fn(),
      expand: vi.fn(),
      onBack: vi.fn(),
      offBack: vi.fn(),
      shareText: vi.fn(() => false),
      openExternalLink: vi.fn(),
      copyToClipboard: vi.fn(async () => true),
    });
    vi.mocked(api.miniAppExchangeSession).mockResolvedValue({ status: "ok", platform: "telegram" });
    vi.mocked(api.miniAppFetchBootstrap).mockResolvedValue({
      role: "specialist",
      roleLabel: "Специалист",
      platform: "telegram",
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

  it("loads bridge, exchanges session, then renders home", async () => {
    render(<MiniAppRoot />);
    await waitFor(() => {
      expect(screen.getByTestId("mini-app-home")).toBeInTheDocument();
    });
    expect(bridgeLoader.ensureMiniAppBridgeReady).toHaveBeenCalled();
    expect(api.miniAppExchangeSession).toHaveBeenCalledWith("telegram", "signed-init");
    expect(api.miniAppFetchBootstrap).toHaveBeenCalledWith("telegram", undefined);
  });
});