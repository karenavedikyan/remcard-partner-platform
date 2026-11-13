import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPartnersListView } from "./ObserverPartnersListView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

/** Cross-read integration: list shell is read-only; navigation is owned by P4 detail views. */
describe("P4.observer-detail-navigation", () => {
  it("partner grouped → client → partner preserves partner context", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getAllByLabelText(/Открыть партнёра:/)[0]);
    expect(screen.getByTestId("ca-observer-partner-page")).toBeTruthy();
    await user.click(screen.getAllByTestId("ca-observer-client-row")[0].querySelector("button")!);
    expect(screen.getByTestId("ca-observer-client-page")).toBeTruthy();
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partner-page")).toBeTruthy();
  });

  it("flat list uses generic back until shell passes backFrom", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
        initialLayout="list"
      />,
    );
    await user.click(screen.getAllByTestId("ca-observer-client-row")[0].querySelector("button")!);
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("← Назад");
  });

  it("flat list → client → list (synthetic missing partner route)", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
        initialLayout="list"
      />,
    );
    await user.click(screen.getAllByTestId("ca-observer-client-row")[0].querySelector("button")!);
    expect(screen.getByTestId("ca-observer-client-page")).toBeTruthy();
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partners-list")).toBeTruthy();
  });

});
