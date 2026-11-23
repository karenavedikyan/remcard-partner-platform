/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppWallet } from "./MiniAppWallet";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import { buildMiniAppFixture } from "@/app/dev/mini-app-fixture/fixtures-data";

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
  });
});