import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientsDirectionWorkspace } from "./ClientsDirectionWorkspace";
import { OwnerClientsModeProvider } from "@/components/clients/OwnerClientsModeContext";
import * as observerLoad from "@/lib/clients-parity/fetch-observer-appeals";

const blocked = {
  ok: false as const,
  code: "BLOCKED_CONTRACT" as const,
  blockerId: "BLK-OBSERVER-REFERRED",
  message: "stub",
  missingRoutes: [],
};

function wrap(mode: "specialist" | "business", ui: ReactNode) {
  return (
    <OwnerClientsModeProvider
      mode={mode}
      businessPartnerType={mode === "business" ? "STORE" : undefined}
    >
      {ui}
    </OwnerClientsModeProvider>
  );
}

describe("P6.ClientsDirectionWorkspace C04 tab context", () => {
  beforeEach(() => {
    vi.spyOn(observerLoad, "fetchObserverReferredAppeals").mockResolvedValue(blocked);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps observer subtree mounted but hidden when returning to incoming", async () => {
    const user = userEvent.setup();
    render(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    await user.click(screen.getByRole("tab", { name: "Мои клиенты у партнёров" }));
    await screen.findByTestId("ca-observer-partners-list");
    await user.click(screen.getByRole("tab", { name: "Клиенты у меня" }));
    expect(screen.getByTestId("ca-clients-panel-incoming")).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("ca-clients-panel-at-partners", { hidden: true })).toBeTruthy();
    expect(
      screen.getByTestId("ca-observer-partners-list", { hidden: true }),
    ).toBeTruthy();
    expect(observerLoad.fetchObserverReferredAppeals).toHaveBeenCalledTimes(1);
  });

  it("resets direction and observer mount on accessMode change", async () => {
    const user = userEvent.setup();
    const { rerender } = render(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    await user.click(screen.getByRole("tab", { name: "Мои клиенты у партнёров" }));
    await screen.findByTestId("ca-observer-partners-list");

    rerender(wrap("business", <ClientsDirectionWorkspace accessMode="business" />));
    expect(screen.getByTestId("ca-receiving-appeals-blocked")).toBeTruthy();
    expect(screen.queryByTestId("ca-clients-panel-at-partners")).toBeNull();
    expect(screen.getByRole("tab", { name: "Клиенты у меня" })).toHaveAttribute("aria-selected", "true");
  });
});
