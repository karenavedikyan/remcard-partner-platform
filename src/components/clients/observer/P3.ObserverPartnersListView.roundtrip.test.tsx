import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPartnersListView } from "./ObserverPartnersListView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

describe("P3.ObserverPartnersListView roundtrip", () => {
  it("shows bucket-specific empty when active bucket has no rows", async () => {
    const user = userEvent.setup();
    const archivedOnly = OBSERVER_FIXTURE_APPEALS.map((a) => a.id);
    const personalMeta = Object.fromEntries(
      archivedOnly.map((id) => [id, { bucket: "archived" as const }]),
    );
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
        displayPersonalMeta={personalMeta}
      />,
    );
    expect(screen.getByRole("heading", { name: "В активном списке нет записей" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Архив/ }));
    expect(screen.queryByRole("heading", { name: "В архиве пока нет записей" })).toBeNull();
    expect(screen.getAllByTestId("ca-observer-client-row").length).toBe(3);
  });

  it("switches grouped and flat layout preserving search", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    expect(screen.getAllByTestId("ca-observer-partner-card").length).toBe(2);
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    expect(screen.queryAllByTestId("ca-observer-partner-card").length).toBe(0);
    expect(screen.getAllByTestId("ca-observer-client-row").length).toBe(3);
    const search = screen.getByPlaceholderText("Имя, партнёр, сертификат");
    await user.type(search, "Мария");
    expect(screen.getByTestId("ca-observer-filter-chips")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Сбросить поиск" }));
    expect((search as HTMLInputElement).value).toBe("");
  });

  it("lists only prototype period options", () => {
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    const options = screen
      .getByLabelText("Период направления")
      .querySelectorAll("option");
    expect([...options].map((o) => o.value)).toEqual(["all", "30", "90"]);
  });
});
