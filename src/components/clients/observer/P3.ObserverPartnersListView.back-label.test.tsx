import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";
import { observerClientBackLabel } from "./ObserverPartnersListView";

vi.mock("./ObserverClientDetailView", () => ({
  ObserverClientDetailView: ({
    backLabel,
    onBack,
  }: {
    backLabel?: string;
    onBack: () => void;
  }) => (
    <div data-testid="ca-observer-client-page">
      <button
        type="button"
        data-testid="ca-clients-back"
        aria-label={backLabel?.replace(/^←\s*/, "") ?? "Назад"}
        onClick={onBack}
      >
        {backLabel ?? "← Назад"}
      </button>
    </div>
  ),
}));

import { ObserverPartnersListView } from "./ObserverPartnersListView";

describe("P3 observer client back labels (P4 backLabel contract)", () => {
  it("observerClientBackLabel matches partner drill vs flat entry", () => {
    expect(
      observerClientBackLabel({ view: "client", clientId: "a", partnerId: "partner-alpha" }),
    ).toBe("← К списку клиентов");
    expect(observerClientBackLabel({ view: "client", clientId: "a" })).toBe("← К партнёрам");
  });

  it("partner drill → client uses «К списку клиентов» and returns to partner page", async () => {
    const user = userEvent.setup();
    const { ObserverPartnersListView: Shell } = await import("./ObserverPartnersListView");
    render(
      <Shell
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getAllByLabelText(/Открыть партнёра:/)[0]);
    const row = screen.getAllByTestId("ca-observer-client-row")[0];
    await user.click(row.querySelector("button")!);
    const back = screen.getByTestId("ca-clients-back");
    expect(back).toHaveTextContent("К списку клиентов");
    await user.click(back);
    expect(screen.getByTestId("ca-observer-partner-page")).toBeTruthy();
  });

  it("flat list → client uses «К партнёрам», preserves layout and row selection", async () => {
    const user = userEvent.setup();
    const { ObserverPartnersListView: Shell } = await import("./ObserverPartnersListView");
    render(
      <Shell
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    const rowCheck = screen.getAllByRole("checkbox", { name: /Выбрать:/ })[0];
    await user.click(rowCheck);
    expect((rowCheck as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getAllByTestId("ca-observer-client-row")[0].querySelector("button")!);
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("К партнёрам");
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partners-list")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Списком/, pressed: true })).toBeTruthy();
    const rowCheckAgain = screen.getAllByRole("checkbox", { name: /Выбрать:/ })[0];
    expect((rowCheckAgain as HTMLInputElement).checked).toBe(true);
  });

  it("grouped card client open uses partner context label and partner page back target", async () => {
    const user = userEvent.setup();
    const { ObserverPartnersListView: Shell } = await import("./ObserverPartnersListView");
    render(
      <Shell
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    const card = screen.getAllByTestId("ca-observer-partner-card")[0];
    const summary = card.querySelector("summary")!;
    await user.click(summary);
    const rowBtn = card.querySelector('[data-testid="ca-observer-client-row"] button')!;
    await user.click(rowBtn);
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("К списку клиентов");
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partner-page")).toBeTruthy();
  });
});
