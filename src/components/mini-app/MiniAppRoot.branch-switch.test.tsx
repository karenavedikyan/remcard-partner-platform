import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppRoot } from "./MiniAppRoot";
import { buildMiniAppFixture } from "@/app/dev/mini-app-fixture/fixtures-data";
import * as api from "@/lib/mini-app/api";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/mini-app/api", async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return { ...actual, miniAppFetchBootstrap: vi.fn() };
});

describe("MiniAppRoot branch pick", () => {
  const companyBootstrap = buildMiniAppFixture("company", "telegram", { canCreate: true, canScan: true }, true);

  beforeEach(() => {
    vi.mocked(api.miniAppFetchBootstrap).mockReset();
  });

  it("keeps home on bootstrap failure and shows retry on branch picker", async () => {
    const user = userEvent.setup();
    render(
      <MiniAppRoot fixtureBootstrap={companyBootstrap} fixturePlatform="telegram" initialScreen="home" />,
    );
    expect(screen.getByTestId("mini-app-home")).toBeInTheDocument();
    const wallet = screen.getByTestId("mini-app-wallet-card");
    expect(wallet).toBeInTheDocument();

    await user.click(screen.getByTestId("mini-app-branch-select"));
    expect(screen.getByTestId("mini-app-branch-pick")).toBeInTheDocument();

    vi.mocked(api.miniAppFetchBootstrap).mockRejectedValue(
      new RemcardApiError(403, "Филиал недоступен", {}),
    );

    await user.click(screen.getByTestId("mini-branch-option-b2"));

    await waitFor(() => {
      expect(screen.getByTestId("mini-branch-pick-error")).toHaveTextContent(/Филиал недоступен/);
    });
    expect(screen.queryByTestId("mini-app-error")).toBeNull();
    expect(screen.getByTestId("mini-branch-option-b1")).toHaveClass(/branchOptionActive/);
    expect(api.miniAppFetchBootstrap).toHaveBeenCalledWith("telegram", "b2");
  });

  it("passes selected branch to mini bootstrap without patching pro context", async () => {
    const user = userEvent.setup();
    const refreshed = {
      ...companyBootstrap,
      activeBranchId: "b2",
      workplaceLabel: "пр. Демо, Казань",
      wallet: { ...companyBootstrap.wallet, confirmedUnpaidRub: 9_999 },
    };
    vi.mocked(api.miniAppFetchBootstrap).mockResolvedValue(refreshed);

    render(
      <MiniAppRoot fixtureBootstrap={companyBootstrap} fixturePlatform="telegram" initialScreen="home" />,
    );
    await user.click(screen.getByTestId("mini-app-branch-select"));
    await user.click(screen.getByTestId("mini-branch-option-b2"));

    await waitFor(() => {
      expect(screen.getByTestId("mini-app-home")).toBeInTheDocument();
    });
    expect(screen.getByTestId("mini-app-branch-select")).toHaveTextContent("пр. Демо, Казань");
    expect(api.miniAppFetchBootstrap).toHaveBeenCalledWith("telegram", "b2");
  });
});