import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientsDirectionWorkspace } from "./ClientsDirectionWorkspace";
import { OwnerClientsModeProvider } from "@/components/clients/OwnerClientsModeContext";

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

describe("P6.ClientsDirectionWorkspace role composition", () => {
  it("agent: observer-only shell, no direction tabs or receiving CRM", async () => {
    render(wrap("agent", <ClientsDirectionWorkspace accessMode="agent" />));
    expect(screen.queryByTestId("ca-clients-directions")).toBeNull();
    expect(screen.queryByTestId("ca-receiving-appeals-blocked")).toBeNull();
    expect(screen.queryByTestId("clients-page-add")).toBeNull();
    expect(await screen.findByTestId("ca-observer-partners-list")).toBeTruthy();
    expect(await screen.findByTestId("clients-parity-contract-blocked")).toBeTruthy();
    expect(screen.getByText(/BLK-OBSERVER-REFERRED/)).toBeTruthy();
  });

  it("specialist: incoming tab shows receiving contract blocker, not observer blocker", () => {
    render(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    expect(screen.getByTestId("ca-clients-directions")).toBeTruthy();
    expect(screen.getByTestId("ca-receiving-appeals-blocked")).toBeTruthy();
    expect(screen.getByText(/BLK-RECEIVING-APPEALS/)).toBeTruthy();
    expect(screen.queryByTestId("clients-parity-contract-blocked")).toBeNull();
    expect(screen.getByRole("tab", { name: "Клиенты у меня" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("ca-clients-panel-incoming")).toBeTruthy();
  });

  it("specialist: switching to at-partners shows observer blocked state", async () => {
    const user = userEvent.setup();
    render(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    await user.click(screen.getByRole("tab", { name: "Мои клиенты у партнёров" }));
    expect(screen.getByRole("tab", { name: "Мои клиенты у партнёров" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("ca-clients-panel-at-partners")).toBeTruthy();
    expect(screen.queryByTestId("ca-receiving-appeals-blocked")).toBeNull();
    expect(await screen.findByTestId("clients-parity-contract-blocked")).toBeTruthy();
    expect(screen.getByText(/BLK-OBSERVER-REFERRED/)).toBeTruthy();
  });

  it("business: same tab model as specialist with receiving blocker on incoming", () => {
    render(
      wrap("business", <ClientsDirectionWorkspace accessMode="business" />, "COMPANY"),
    );
    expect(screen.getByTestId("ca-clients-directions")).toBeTruthy();
    expect(screen.getByTestId("ca-receiving-appeals-blocked")).toBeTruthy();
    expect(screen.queryByTestId("ca-observer-partners-list")).toBeNull();
  });
});
