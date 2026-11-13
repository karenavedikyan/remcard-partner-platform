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

function wrap(
  mode: "agent" | "specialist" | "business",
  ui: ReactNode,
  businessPartnerType?: "STORE" | "COMPANY",
) {
  return (
    <OwnerClientsModeProvider
      mode={mode}
      businessPartnerType={mode === "business" ? (businessPartnerType ?? "STORE") : undefined}
    >
      {ui}
    </OwnerClientsModeProvider>
  );
}

describe("P6.ClientsDirectionWorkspace role rerender", () => {
  beforeEach(() => {
    vi.spyOn(observerLoad, "fetchObserverReferredAppeals").mockResolvedValue(blocked);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("specialist -> agent -> specialist: stable hooks, fresh tab state", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />),
    );
    await user.click(screen.getByRole("tab", { name: "Мои клиенты у партнёров" }));
    await screen.findByTestId("ca-clients-panel-at-partners");
    expect(observerLoad.fetchObserverReferredAppeals).toHaveBeenCalledTimes(1);

    rerender(wrap("agent", <ClientsDirectionWorkspace accessMode="agent" />));
    expect(screen.queryByTestId("ca-clients-directions")).toBeNull();
    await screen.findByTestId("ca-observer-partners-list");

    rerender(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    expect(screen.getByRole("tab", { name: "Клиенты у меня" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByTestId("ca-clients-panel-at-partners")).toBeNull();
    expect(screen.getByTestId("ca-receiving-appeals-blocked")).toBeTruthy();
    expect(observerLoad.fetchObserverReferredAppeals).toHaveBeenCalledTimes(2);
  });

  it("business -> specialist: keyed subtree resets selection and lazy observer", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      wrap("business", <ClientsDirectionWorkspace accessMode="business" />, "COMPANY"),
    );
    await user.click(screen.getByRole("tab", { name: "Мои клиенты у партнёров" }));
    await screen.findByTestId("ca-clients-panel-at-partners");
    expect(observerLoad.fetchObserverReferredAppeals).toHaveBeenCalledTimes(1);

    rerender(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    expect(screen.getByTestId("clients-direction-workspace")).toHaveAttribute(
      "data-ca-clients-direction-mode",
      "specialist",
    );
    expect(screen.getByRole("tab", { name: "Клиенты у меня" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByTestId("ca-clients-panel-at-partners")).toBeNull();
    expect(observerLoad.fetchObserverReferredAppeals).toHaveBeenCalledTimes(1);
  });
});
