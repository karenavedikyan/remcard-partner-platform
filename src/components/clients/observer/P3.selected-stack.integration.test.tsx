/**
 * Minimal P3×P4 stack navigation proof — no mocks.
 * Runnable only when P4 detail files are on disk (see verify-p3-p4-stack.sh).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observerClientBackFrom } from "./ObserverClientDetailView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";
import { ObserverPartnersListView } from "./ObserverPartnersListView";

describe("P3.selected-stack.integration", () => {
  it("re-exports P4 observerClientBackFrom (no shell duplicate)", () => {
    expect(observerClientBackFrom({ partnerId: "x" }, "list")).toBe("partner-clients");
  });

  it("flat→client→flat with visible P4 back label", async () => {
    const user = userEvent.setup();
    render(
      <ObserverPartnersListView
        appeals={OBSERVER_FIXTURE_APPEALS}
        partners={OBSERVER_FIXTURE_PARTNERS}
        dataContract={{ status: "ready" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Списком/ }));
    await user.click(screen.getAllByTestId("ca-observer-client-row")[0].querySelector("button")!);
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("Назад к списку");
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(screen.getByTestId("ca-observer-partners-list")).toBeTruthy();
  });
});
