import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";
import { observerClientBackFrom, ObserverPartnersListView } from "./ObserverPartnersListView";

describe("P3.P4 integration — list shell backFrom (requires P4 detail exports)", () => {
  it("observerClientBackFrom maps nav + layout to P4 tokens", () => {
    expect(
      observerClientBackFrom({ view: "client", clientId: "a", partnerId: "p" }, "partners"),
    ).toBe("partner-clients");
    expect(observerClientBackFrom({ view: "client", clientId: "a" }, "list")).toBe("flat-list");
    expect(observerClientBackFrom({ view: "client", clientId: "a" }, "partners")).toBe(
      "partners-list",
    );
  });

  it("partner drill → client → «К списку клиентов» → partner page", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getAllByLabelText(/Открыть партнёра:/)[0]);
    await user.click(screen.getAllByTestId("ca-observer-client-row")[0].querySelector("button")!);
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("К списку клиентов");
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partner-page")).toBeTruthy();
  });

  it("grouped card → client → partner page back target", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    const card = screen.getAllByTestId("ca-observer-partner-card")[0];
    await user.click(card.querySelector("summary")!);
    await user.click(
      card.querySelector('[data-testid="ca-observer-client-row"] button')!,
    );
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("К списку клиентов");
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partner-page")).toBeTruthy();
  });

  it("flat → client → «Назад к списку» preserves search/layout/selection", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    const search = screen.getByPlaceholderText("Имя, партнёр, сертификат");
    await user.type(search, "Анна");
    const rowCheck = screen.getAllByRole("checkbox", { name: /Выбрать:/ })[0];
    await user.click(rowCheck);
    await user.click(screen.getAllByTestId("ca-observer-client-row")[0].querySelector("button")!);
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("Назад к списку");
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partners-list")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Списком/, pressed: true })).toBeTruthy();
    expect((search as HTMLInputElement).value).toBe("Анна");
    expect((rowCheck as HTMLInputElement).checked).toBe(true);
  });

  it("unknown client and partner render P4 missing shells", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
        initialNav={{ view: "client", clientId: "missing-id" }}
      />,
    );
    expect(screen.getByTestId("ca-observer-client-missing")).toBeTruthy();
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partners-list")).toBeTruthy();
    unmount();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
        initialNav={{ view: "partner", partnerId: "unknown-partner" }}
      />,
    );
    expect(screen.getByTestId("ca-observer-partner-missing")).toBeTruthy();
  });
});
