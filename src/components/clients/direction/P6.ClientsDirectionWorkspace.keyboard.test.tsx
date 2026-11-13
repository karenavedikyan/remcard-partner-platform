import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientsDirectionWorkspace } from "./ClientsDirectionWorkspace";
import { OwnerClientsModeProvider } from "@/components/clients/OwnerClientsModeContext";

function wrap(mode: "specialist", ui: ReactNode) {
  return <OwnerClientsModeProvider mode={mode}>{ui}</OwnerClientsModeProvider>;
}

describe("P6.ClientsDirectionWorkspace keyboard integration", () => {
  it("ArrowRight switches tabpanel without mounting both panels at once", async () => {
    const user = userEvent.setup();
    render(wrap("specialist", <ClientsDirectionWorkspace accessMode="specialist" />));
    expect(screen.getByTestId("ca-clients-panel-incoming")).toBeTruthy();
    expect(screen.queryByTestId("ca-clients-panel-at-partners")).toBeNull();

    screen.getByRole("tab", { name: "Клиенты у меня" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByTestId("ca-clients-panel-incoming")).toHaveAttribute("hidden");
    const atPartnersPanel = await screen.findByTestId("ca-clients-panel-at-partners");
    expect(atPartnersPanel).not.toHaveAttribute("hidden");
    expect(screen.getByRole("tab", { name: "Мои клиенты у партнёров" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
