import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPartnerDetailView } from "./ObserverPartnerDetailView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

describe("P4.ObserverPartnerDetailView", () => {
  const longPartner = OBSERVER_FIXTURE_PARTNERS[0];

  it("exposes prototype back control and summary line", () => {
    const appeals = OBSERVER_FIXTURE_APPEALS.filter((a) => a.receivingPartnerId === longPartner.id);
    render(
      <ObserverPartnerDetailView
        partner={longPartner}
        appeals={appeals}
        selectedIds={new Set()}
        onBack={() => undefined}
        onClientOpen={() => undefined}
        onClientSelect={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("Назад к партнёрам");
    expect(screen.getByText(/возвратов/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(longPartner.name);
  });

  it("shows filter-empty state without client rows", () => {
    render(
      <ObserverPartnerDetailView
        partner={longPartner}
        appeals={[]}
        selectedIds={new Set()}
        onBack={() => undefined}
        onClientOpen={() => undefined}
        onClientSelect={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-observer-partner-filter-empty")).toBeTruthy();
    expect(screen.queryByTestId("ca-observer-client-row")).toBeNull();
  });

  it("fires onBack from keyboard activation", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    const appeals = OBSERVER_FIXTURE_APPEALS.filter((a) => a.receivingPartnerId === longPartner.id);
    render(
      <ObserverPartnerDetailView
        partner={longPartner}
        appeals={appeals}
        selectedIds={new Set()}
        onBack={onBack}
        onClientOpen={() => undefined}
        onClientSelect={() => undefined}
      />,
    );
    await user.tab();
    const back = screen.getByTestId("ca-clients-back");
    expect(back).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("opens client via row control", async () => {
    const user = userEvent.setup();
    const onClientOpen = vi.fn();
    const appeals = OBSERVER_FIXTURE_APPEALS.filter((a) => a.receivingPartnerId === longPartner.id);
    render(
      <ObserverPartnerDetailView
        partner={longPartner}
        appeals={appeals}
        selectedIds={new Set()}
        onBack={() => undefined}
        onClientOpen={onClientOpen}
        onClientSelect={() => undefined}
      />,
    );
    const row = screen.getAllByTestId("ca-observer-client-row")[0];
    await user.click(within(row).getByRole("button"));
    expect(onClientOpen).toHaveBeenCalledTimes(1);
  });
});
