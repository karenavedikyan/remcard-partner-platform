import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverClientDetailView } from "./ObserverClientDetailView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

describe("P4.ObserverClientDetailView", () => {
  const appeal = OBSERVER_FIXTURE_APPEALS[0];
  const partner = OBSERVER_FIXTURE_PARTNERS[0];

  it("renders separated interest, certificate and timestamps", () => {
    render(<ObserverClientDetailView appeal={appeal} partner={partner} onBack={() => undefined} />);
    expect(screen.getAllByText("Кухня на заказ").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("CERT-1001")).toBeTruthy();
    expect(screen.getByText("Партнёр")).toBeTruthy();
    expect(screen.getByText(partner.name)).toBeTruthy();
    expect(screen.getByText("Новое обращение")).toBeTruthy();
  });

  it("marks missing partner meta as unavailable", () => {
    render(<ObserverClientDetailView appeal={appeal} onBack={() => undefined} />);
    expect(screen.getByTestId("ca-observer-partner-unavailable")).toHaveTextContent(
      appeal.receivingPartnerId,
    );
  });

  it("honestly blocks timeline and purchase without contract", () => {
    render(<ObserverClientDetailView appeal={appeal} partner={partner} onBack={() => undefined} />);
    expect(screen.getByTestId("ca-observer-client-timeline-na")).toHaveTextContent(
      "BLK-OBSERVER-REFERRED",
    );
  });

  it("supports contextual back label and activation", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ObserverClientDetailView
        appeal={appeal}
        partner={partner}
        backLabel="← К списку клиентов"
        onBack={onBack}
      />,
    );
    const back = screen.getByTestId("ca-clients-back");
    expect(back).toHaveTextContent("К списку клиентов");
    await user.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
