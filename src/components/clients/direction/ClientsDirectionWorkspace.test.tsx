import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientsDirectionWorkspace } from "./ClientsDirectionWorkspace";
import { OwnerClientsModeProvider } from "@/components/clients/OwnerClientsModeContext";

function wrap(mode: "agent" | "specialist" | "business", ui: ReactNode) {
  return (
    <OwnerClientsModeProvider
      mode={mode}
      businessPartnerType={mode === "business" ? "STORE" : undefined}
    >
      {ui}
    </OwnerClientsModeProvider>
  );
}

describe("ClientsDirectionWorkspace", () => {
  it("agent shows observer list without CRM add control", async () => {
    render(wrap("agent", <ClientsDirectionWorkspace accessMode="agent" />));
    expect(await screen.findByTestId("ca-observer-partners-list")).toBeTruthy();
    expect(screen.queryByTestId("clients-page-add")).toBeNull();
    expect(await screen.findByTestId("clients-parity-contract-blocked")).toBeTruthy();
  });

  it("specialist shows direction tabs and receiving blocker on incoming", () => {
    render(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    expect(screen.getByTestId("ca-clients-directions")).toBeTruthy();
    expect(screen.getByTestId("ca-receiving-appeals-blocked")).toBeTruthy();
  });
});
