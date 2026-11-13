import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ObserverClientDetailMissing,
  ObserverClientDetailView,
  observerClientBackFrom,
  resolveObserverClientBackFrom,
  resolveObserverClientBackLabel,
} from "./ObserverClientDetailView";
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

  it("renders K2 publicTimeline without private fields", () => {
    render(
      <ObserverClientDetailView
        appeal={appeal}
        partner={partner}
        publicTimeline={[
          { at: "2026-11-10T12:00:00Z", text: "Создано обращение по сертификату" },
        ]}
        onBack={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-receiving-appeal-history")).toBeTruthy();
    expect(screen.queryByTestId("ca-observer-client-timeline-na")).toBeNull();
  });

  it("ready page state with K2 empty timeline drops BLK banner", () => {
    render(
      <ObserverClientDetailView
        status="ready"
        appeal={appeal}
        partner={partner}
        publicTimeline={[]}
        purchase={null}
        onBack={() => undefined}
      />,
    );
    expect(screen.queryByTestId("ca-observer-client-timeline-na")).toBeNull();
    expect(screen.getByTestId("ca-observer-client-purchase-empty")).toBeTruthy();
  });

  it("shows purchase projection from K2", () => {
    render(
      <ObserverClientDetailView
        status="ready"
        appeal={appeal}
        partner={partner}
        publicTimeline={[]}
        purchase={{ amountKopecks: 99_900, note: "Оплата" }}
        onBack={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-observer-client-purchase")).toHaveTextContent("999");
    expect(screen.getByTestId("ca-observer-client-purchase")).toHaveTextContent("Оплата");
  });

  it("loading and error shells with retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <ObserverClientDetailView status="loading" onBack={() => undefined} />,
    );
    expect(screen.getByTestId("ca-observer-client-loading")).toBeTruthy();

    rerender(
      <ObserverClientDetailView
        status="error"
        message="Сеть недоступна"
        onRetry={onRetry}
        onBack={() => undefined}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("maps backFrom to prototype labels without shell wiring", () => {
    expect(resolveObserverClientBackLabel("partner-clients")).toBe("← К списку клиентов");
    expect(resolveObserverClientBackLabel("partners-list")).toBe("← К партнёрам");
    expect(resolveObserverClientBackLabel("flat-list")).toBe("← Назад к списку");
    expect(resolveObserverClientBackLabel(undefined, "← custom")).toBe("← custom");
  });

  it("resolveObserverClientBackFrom matches P3 nav slice", () => {
    expect(resolveObserverClientBackFrom({ navPartnerId: "p1", layout: "list" })).toBe(
      "partner-clients",
    );
    expect(resolveObserverClientBackFrom({ layout: "list" })).toBe("flat-list");
    expect(resolveObserverClientBackFrom({ layout: "partners" })).toBe("partners-list");
  });

  it("observerClientBackFrom is the P3 shell entry point (9c3221ad)", () => {
    expect(observerClientBackFrom({ partnerId: "p1" }, "partners")).toBe("partner-clients");
    expect(observerClientBackFrom({}, "list")).toBe("flat-list");
    expect(observerClientBackFrom({}, "partners")).toBe("partners-list");
    expect(observerClientBackFrom({ partnerId: "p1" }, "list")).toBe("partner-clients");
  });

  it("shows grouped and flat visible back labels on detail", () => {
    const { rerender } = render(
      <ObserverClientDetailView
        appeal={appeal}
        partner={partner}
        backFrom="partner-clients"
        onBack={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("← К списку клиентов");
    rerender(
      <ObserverClientDetailView
        appeal={appeal}
        partner={partner}
        backFrom="flat-list"
        onBack={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("← Назад к списку");
  });

  it("keyboard Enter on missing client back", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ObserverClientDetailMissing clientId="x" backFrom="flat-list" onBack={onBack} />,
    );
    await user.tab();
    await user.keyboard("{Enter}");
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("exposes appeal id for long identifiers", () => {
    const longId = "ref-" + "x".repeat(48);
    render(
      <ObserverClientDetailView
        appeal={{ ...appeal, id: longId }}
        partner={partner}
        onBack={() => undefined}
      />,
    );
    expect(screen.getByTestId("ca-observer-appeal-id")).toHaveTextContent(longId);
  });

  it("renders missing record shell with back", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(
      <ObserverClientDetailMissing
        clientId="ghost-ref"
        backFrom="partner-clients"
        onBack={onBack}
      />,
    );
    expect(screen.getByTestId("ca-observer-client-missing")).toBeTruthy();
    await user.click(screen.getByTestId("ca-clients-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("← К списку клиентов")).toBeTruthy();
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
