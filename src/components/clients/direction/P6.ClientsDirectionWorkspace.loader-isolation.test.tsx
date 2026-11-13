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

function wrap(mode: "agent" | "specialist", ui: ReactNode) {
  return <OwnerClientsModeProvider mode={mode}>{ui}</OwnerClientsModeProvider>;
}

describe("P6.ClientsDirectionWorkspace loader isolation", () => {
  beforeEach(() => {
    vi.spyOn(observerLoad, "fetchObserverReferredAppeals").mockResolvedValue(blocked);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("specialist on incoming tab does not mount observer loader", () => {
    render(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    expect(screen.getByTestId("ca-receiving-appeals-blocked")).toBeTruthy();
    expect(observerLoad.fetchObserverReferredAppeals).not.toHaveBeenCalled();
  });

  it("specialist loads observer adapter only after at-partners activation", async () => {
    const user = userEvent.setup();
    render(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    expect(observerLoad.fetchObserverReferredAppeals).not.toHaveBeenCalled();
    screen.getByRole("tab", { name: "Клиенты у меня" }).focus();
    await user.keyboard("{ArrowRight}");
    await screen.findByTestId("ca-clients-panel-at-partners");
    expect(observerLoad.fetchObserverReferredAppeals).toHaveBeenCalledTimes(1);
  });

  it("agent observer-only path invokes observer adapter once", async () => {
    render(wrap("agent", <ClientsDirectionWorkspace accessMode="agent" />));
    await screen.findByTestId("ca-observer-partners-list");
    expect(observerLoad.fetchObserverReferredAppeals).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("ca-receiving-appeals-blocked")).toBeNull();
    expect(screen.queryByTestId("ca-clients-directions")).toBeNull();
  });
});
