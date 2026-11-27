/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppWallet } from "./MiniAppWallet";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import { buildMiniAppFixture } from "@/app/dev/mini-app-fixture/fixtures-data";
import * as miniAppApi from "@/lib/mini-app/api";
import { RemcardApiError } from "@/lib/api-client";
import { MINI_WALLET_EMPTY_FIXTURE, miniWalletFixtureForRole } from "@/lib/mini-app/wallet/fixtures";
import type { SettlementsResponse } from "@/lib/settlements-types";

const bootstrapAgent = buildMiniAppFixture("agent", "telegram", {
  canCreate: true,
  canScan: false,
});

const bootstrapStore = buildMiniAppFixture("store", "max", {
  canCreate: true,
  canScan: true,
});

describe("MiniAppWallet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("agent: no direction tabs, shows incoming summary", async () => {
    render(
      <MiniAppWallet
        platform="telegram"
        bootstrap={bootstrapAgent}
        branchId={null}
        embeddedContext="default"
        fixtureMode
        onBack={() => {}}
        onOpenProfSettlements={() => {}}
      />,
    );
    await screen.findByTestId("mini-wallet-confirmed");
    expect(screen.queryByTestId("mini-wallet-dir-tabs")).toBeNull();
    expect(screen.getByTestId("mini-wallet-confirmed").textContent).toMatch(/₽/);
  });

  it("store: toggles Мне должны / Я должен", async () => {
    const user = userEvent.setup();
    render(
      <MiniAppWallet
        platform="max"
        bootstrap={bootstrapStore}
        branchId="b1"
        embeddedContext="default"
        fixtureMode
        onBack={() => {}}
        onOpenProfSettlements={() => {}}
      />,
    );
    const tabs = await screen.findByTestId("mini-wallet-dir-tabs");
    await user.click(within(tabs).getByTestId("mini-wallet-tab-out"));
    expect(screen.getByTestId("mini-wallet-confirmed").textContent).toMatch(/₽/);
  });

  it("filters are clickable at 375px layout class shell", async () => {
    const user = userEvent.setup();
    render(
      <MiniAppWallet
        platform="telegram"
        bootstrap={bootstrapStore}
        branchId={null}
        embeddedContext="default"
        fixtureMode
        onBack={() => {}}
        onOpenProfSettlements={() => {}}
      />,
    );
    const waitingChip = await screen.findByTestId("mini-wallet-filter-waiting");
    await user.click(waitingChip);
    expect(waitingChip.className).toMatch(/mwChipActive/);
    expect(screen.queryByTestId("mini-wallet-empty")).toBeNull();
  });

  const baseProps = {
    platform: "max" as const, bootstrap: bootstrapStore, branchId: "b1",
    embeddedContext: "default" as const, onBack: vi.fn(), onOpenProfSettlements: vi.fn(),
  };

  it("offers the role action only for authorized non-staff, and retains payout-only history", async () => {
    const onWalletAction = vi.fn();
    const { rerender } = render(
      <MiniAppWallet {...baseProps} fixtureMode fixtureWalletData={MINI_WALLET_EMPTY_FIXTURE} onWalletAction={onWalletAction} />,
    );
    await screen.findByTestId("mini-wallet-empty");
    await userEvent.click(screen.getByRole("button", { name: "Проверить сертификат" }));
    expect(onWalletAction).toHaveBeenCalledWith("scan_qr");
    rerender(<MiniAppWallet {...baseProps} fixtureMode
      fixtureWalletData={{ ...MINI_WALLET_EMPTY_FIXTURE, walletReadScope: "org-staff-branches" }}
      onWalletAction={onWalletAction}
    />);
    expect(screen.getByTestId("mini-wallet-empty")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Проверить сертификат" })).toBeNull();
    rerender(<MiniAppWallet {...baseProps} fixtureMode
      fixtureWalletData={{ ...MINI_WALLET_EMPTY_FIXTURE, completed: miniWalletFixtureForRole("agent").completed }}
    />);
    await screen.findByTestId("mini-wallet-dir-tabs");
    expect(screen.queryByTestId("mini-wallet-empty")).toBeNull();
  });

  it.each([
    [403, "BRANCH_FORBIDDEN", "branch-denied"],
    [403, "WALLET_FORBIDDEN", "forbidden"],
    [400, "BRANCH_REQUIRED", "branch_required"],
    [401, undefined, "session_expired"],
    [403, undefined, "error"],
    [404, undefined, "error"],
    [503, undefined, "error"],
  ] as const)("classifies %s/%s without displaying any balance", async (status, code, state) => {
    vi.spyOn(miniAppApi, "miniAppFetchWalletSettlements").mockRejectedValue(
      new RemcardApiError(status, "Нет доступа к филиалу", code ? { code } : null),
    );
    render(<MiniAppWallet {...baseProps} />);
    await screen.findByTestId(`mini-wallet-${state}`);
    expect(screen.queryByTestId("mini-wallet-confirmed")).toBeNull();
    expect(screen.queryByTestId("mini-wallet-empty")).toBeNull();
    expect(Boolean(screen.queryByRole("button", { name: "Повторить загрузку" }))).toBe(state === "error");
  });

  it("hides amounts during scope changes, ignores obsolete replies and refetches rather than reusing the home snapshot", async () => {
    const initial = { ...miniWalletFixtureForRole("store"), canSwitchBranchLedgerScope: true };
    let resolveAll!: (data: SettlementsResponse) => void;
    let resolveBranch!: (data: SettlementsResponse) => void;
    const fetch = vi.spyOn(miniAppApi, "miniAppFetchWalletSettlements")
      .mockReturnValueOnce(new Promise((resolve) => { resolveAll = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveBranch = resolve; }));
    render(<MiniAppWallet {...baseProps} initialData={initial} />);
    expect(screen.getByTestId("mini-wallet-confirmed")).toBeTruthy();
    await userEvent.click(screen.getByTestId("mini-wallet-scope-all"));
    expect(screen.queryByTestId("mini-wallet-confirmed")).toBeNull();
    expect(fetch).toHaveBeenLastCalledWith("max", expect.objectContaining({ settlementsSearchParams: undefined }));
    await userEvent.click(screen.getByTestId("mini-wallet-scope-branch"));
    expect(fetch).toHaveBeenLastCalledWith("max", expect.objectContaining({ settlementsSearchParams: { branchId: "b1" } }));
    await act(async () => { resolveAll(initial); });
    expect(screen.queryByTestId("mini-wallet-confirmed")).toBeNull();
    await act(async () => { resolveBranch(MINI_WALLET_EMPTY_FIXTURE); });
    expect(screen.getByTestId("mini-wallet-empty")).toBeTruthy();
  });
});
