import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppRoot } from "./MiniAppRoot";
import { buildMiniAppFixture, MINI_APP_FIXTURE_CREATE_SEED } from "@/app/dev/mini-app-fixture/fixtures-data";
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
    expect(api.miniAppFetchBootstrap).toHaveBeenCalledWith("telegram", { branchId: "b2", embeddedContext: "default" });
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
    expect(api.miniAppFetchBootstrap).toHaveBeenCalledWith("telegram", { branchId: "b2", embeddedContext: "default" });
  });

  it("opens company wallet on the selected direction and preserves it on return", async () => {
    const user = userEvent.setup();
    render(<MiniAppRoot fixtureBootstrap={companyBootstrap} fixturePlatform="telegram" />);
    expect(screen.getByTestId("mini-wallet-card-confirmed")).toHaveTextContent(/12\s480/);
    expect(screen.getByTestId("mini-wallet-card-waiting")).toHaveTextContent(/3\s200/);
    await user.click(screen.getByRole("button", { name: "Я должен" }));
    expect(screen.getByTestId("mini-wallet-card-confirmed")).toHaveTextContent(/11\s200/);
    expect(screen.getByTestId("mini-wallet-card-waiting")).toHaveTextContent(/5\s500/);
    await user.click(screen.getByTestId("mini-wallet-card-open"));
    expect(screen.getByRole("tab", { name: /Я должен/, selected: true })).toBeInTheDocument();
    expect(screen.getByTestId("mini-wallet-summary")).toHaveTextContent(/11\s200/);
    await user.click(screen.getByRole("button", { name: /К кабинету/ }));
    expect(screen.getByRole("button", { name: "Я должен", pressed: true })).toBeInTheDocument();
  });

  it.each(["company", "store"] as const)(
    "resumes certificate creation for %s after a confirmed branch selection",
    async (role) => {
      const user = userEvent.setup();
      const ready = buildMiniAppFixture(role, "telegram", { canCreate: true, canScan: true }, true);
      vi.mocked(api.miniAppFetchBootstrap).mockResolvedValue(ready);
      render(
        <MiniAppRoot
          fixturePlatform="telegram"
          fixtureCreateSeed={MINI_APP_FIXTURE_CREATE_SEED}
          fixtureBootstrap={{
            ...ready,
            activeBranchId: null,
            workplaceLabel: null,
            workplaceForbidden: true,
            workplaceForbiddenMessage: "Выберите рабочую точку для выпуска сертификата.",
          }}
        />,
      );
      expect(screen.getByTestId("mini-app-branch-select")).toHaveTextContent("Сейчас филиал не выбран");
      await user.click(screen.getByTestId("mini-action-create_certificate"));
      expect(screen.getByRole("button", { name: /Назад/ })).toBeInTheDocument();
      await user.click(screen.getByTestId("mini-branch-option-b1"));
      expect(await screen.findByTestId("mini-create-form")).toBeInTheDocument();
      expect(screen.queryByTestId("mini-app-home")).toBeNull();
    },
  );

  it("does not resume a requested action when the confirmed branch no longer grants it", async () => {
    const user = userEvent.setup();
    const denied = buildMiniAppFixture("store", "telegram", { canCreate: false, canScan: true }, true);
    vi.mocked(api.miniAppFetchBootstrap).mockResolvedValue(denied);
    render(
      <MiniAppRoot
        fixturePlatform="telegram"
        fixtureBootstrap={{
          ...buildMiniAppFixture("store", "telegram", { canCreate: true, canScan: true }, true),
          activeBranchId: null,
          workplaceLabel: null,
        }}
      />,
    );
    await user.click(screen.getByTestId("mini-action-create_certificate"));
    await user.click(screen.getByTestId("mini-branch-option-b1"));
    expect(await screen.findByTestId("mini-app-home")).toBeInTheDocument();
    expect(screen.queryByTestId("mini-action-create_certificate")).toBeNull();
  });

  it("opens the scanner after confirming the requested work location", async () => {
    const user = userEvent.setup();
    const ready = buildMiniAppFixture("company", "telegram", { canCreate: true, canScan: true }, true);
    vi.mocked(api.miniAppFetchBootstrap).mockResolvedValue(ready);
    render(
      <MiniAppRoot
        fixturePlatform="telegram"
        fixtureBootstrap={{ ...ready, activeBranchId: null, workplaceLabel: null }}
      />,
    );
    await user.click(screen.getByTestId("mini-action-scan_qr"));
    await user.click(screen.getByTestId("mini-branch-option-b1"));
    expect(await screen.findByRole("heading", { name: "Сканер" })).toBeInTheDocument();
  });
});