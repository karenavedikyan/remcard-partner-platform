import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPartnersListView } from "./ObserverPartnersListView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

describe("P3.ObserverPartnersListView states", () => {
  it("shows trash bucket empty copy", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Корзина/ }));
    expect(screen.getByRole("heading", { name: "Корзина пуста" })).toBeTruthy();
  });

  it("filter reset preserves bucket and clears chips", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    const search = screen.getByPlaceholderText("Имя, партнёр, сертификат");
    await user.type(search, "zzz-nomatch");
    expect(screen.getByTestId("ca-observer-filter-empty")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Сбросить фильтры" }));
    expect(screen.queryByTestId("ca-observer-filter-chips")).toBeNull();
    expect(screen.getByRole("button", { name: /Активные/, pressed: true })).toBeTruthy();
    expect(screen.getAllByTestId("ca-observer-partner-card").length).toBe(2);
  });

  it("dataContract blocked still renders filter shell without cards", () => {
    render(
      <ObserverPartnersListView
        appeals={[]}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{
          status: "blocked",
          blockerId: "BLK-OBSERVER-REFERRED",
          message: "Нет контракта",
          missingRoutes: ["/api/x"],
        }}
      />,
    );
    expect(screen.getByText(/Нет контракта/)).toBeTruthy();
    expect(screen.getByPlaceholderText("Имя, партнёр, сертификат")).toBeTruthy();
    expect(screen.queryAllByTestId("ca-observer-partner-card").length).toBe(0);
  });
});
