import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPartnersListView } from "./ObserverPartnersListView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

function renderFixture() {
  return render(
    <ObserverPartnersListView
      appeals={OBSERVER_FIXTURE_APPEALS}
      partners={OBSERVER_FIXTURE_PARTNERS}
      dataContract={{ status: "ready" }}
    />,
  );
}

describe("ObserverPartnersListView (fixture presentation)", () => {
  it("renders grouped compact cards with four KPI metrics", () => {
    renderFixture();
    const cards = screen.getAllByTestId("ca-observer-partner-card");
    expect(cards.length).toBe(2);
    const alpha = cards[0];
    const dds = within(alpha).getAllByRole("definition");
    expect(dds[0]?.textContent).toBe("2");
  });

  it("toggles partner disclosure independently", () => {
    renderFixture();
    const details = screen.getAllByTestId("ca-observer-partner-card")[0].querySelector(
      "details",
    ) as HTMLDetailsElement;
    fireEvent.click(details.querySelector("summary")!);
    expect(details.open).toBe(true);
  });

  it("navigates to partner page and back preserving filters", async () => {
    const user = userEvent.setup();
    renderFixture();
  const search = screen.getByPlaceholderText("Имя, партнёр, сертификат");
    await user.type(search, "Анна");
    await user.click(screen.getAllByLabelText(/Открыть партнёра:/)[0]);
    expect(screen.getByTestId("ca-observer-partner-page")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Назад к партнёрам/ }));
    expect(screen.getByTestId("ca-observer-partners-list")).toBeTruthy();
    expect((search as HTMLInputElement).value).toBe("Анна");
  });

  it("navigates partner → client → back", async () => {
    const user = userEvent.setup();
    renderFixture();
    await user.click(screen.getAllByLabelText(/Открыть партнёра:/)[0]);
    await user.click(screen.getAllByTestId("ca-observer-client-row")[0].querySelector("button")!);
    expect(screen.getByTestId("ca-observer-client-page")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Назад/ }));
    expect(screen.getByTestId("ca-observer-partner-page")).toBeTruthy();
  });

  it("edit form cancel discards draft without persistence", async () => {
    const user = userEvent.setup();
    renderFixture();
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    await user.click(screen.getAllByRole("button", { name: "Изменить" })[0]);
    const alias = screen.getByLabelText("Имя для себя");
    await user.type(alias, "Черновик");
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(screen.queryByLabelText("Имя для себя")).toBeNull();
    await user.click(screen.getAllByRole("button", { name: "Изменить" })[0]);
    expect((screen.getByLabelText("Имя для себя") as HTMLInputElement).value).toBe("");
  });

  it("confirm archive blocks persistence without mutating list", async () => {
    const user = userEvent.setup();
    renderFixture();
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    const rowCheck = screen.getAllByRole("checkbox", { name: /Выбрать:/ })[0];
    await user.click(rowCheck);
    await user.click(screen.getByRole("button", { name: "В архив" }));
    const confirm = screen.getByTestId("ca-observer-personal-confirm");
    await user.click(within(confirm).getByRole("button", { name: "В архив" }));
    expect(screen.getByText(/BLOCKED_PERSISTENCE/)).toBeTruthy();
    expect(screen.getAllByTestId("ca-observer-client-row").length).toBe(3);
  });

  it("save control is disabled with BLOCKED_PERSISTENCE", async () => {
    const user = userEvent.setup();
    renderFixture();
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    await user.click(screen.getAllByRole("button", { name: "Изменить" })[0]);
    const save = screen.getByRole("button", { name: /Сохранить \(недоступно\)/ });
    expect(save).toHaveProperty("disabled", true);
  });
});
