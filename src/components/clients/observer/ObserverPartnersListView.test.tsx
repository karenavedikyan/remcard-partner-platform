import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPartnersListView } from "./ObserverPartnersListView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

describe("ObserverPartnersListView (fixture presentation)", () => {
  it("renders grouped compact cards with four KPI metrics", () => {
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    const cards = screen.getAllByTestId("ca-observer-partner-card");
    expect(cards.length).toBe(2);
    const alpha = cards[0];
    expect(within(alpha).getByText("Направлено")).toBeTruthy();
    const dds = within(alpha).getAllByRole("definition");
    expect(dds[0]?.textContent).toBe("2");
    expect(within(alpha).getAllByText("В работе").length).toBeGreaterThan(0);
  });

  it("toggles partner disclosure independently", async () => {
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    const cards = screen.getAllByTestId("ca-observer-partner-card");
    const details = cards[0].querySelector("details") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    fireEvent.click(details.querySelector("summary")!);
    expect(details.open).toBe(true);
    const second = cards[1].querySelector("details") as HTMLDetailsElement;
    expect(second.open).toBe(false);
  });

  it("shows filter chips and clears search", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    const search = screen.getByPlaceholderText("Имя, партнёр, сертификат");
    await user.type(search, "Анна");
    expect(screen.getByTestId("ca-observer-filter-chips")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Поиск: Анна/ }));
    expect((search as HTMLInputElement).value).toBe("");
  });

  it("switches to flat list layout", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    expect(screen.getAllByTestId("ca-observer-client-row").length).toBe(3);
  });

  it("partner checkbox selects visible client rows", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    const group = screen.getAllByLabelText(/Выбрать клиентов:/)[0];
    await user.click(group);
    expect(screen.getByText("Выбрано: 2")).toBeTruthy();
  });

  it("edit action surfaces BLOCKED_PERSISTENCE notice", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    await user.click(screen.getAllByRole("button", { name: "Изменить" })[0]);
    const tools = screen.getByTestId("ca-observer-personal-tools");
    expect(within(tools).getByText(/BLOCKED_PERSISTENCE/)).toBeTruthy();
  });
});
