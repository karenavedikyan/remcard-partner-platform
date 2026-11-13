import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverPartnerCard } from "./ObserverPartnerCard";
import type { ObserverPartnerMeta, ObserverReferredAppeal } from "@/lib/clients-parity/types";

const partner: ObserverPartnerMeta = {
  id: "p1",
  name: "Салон Альфа",
  city: "Москва",
  category: "Ремонт",
};

const appeals: ObserverReferredAppeal[] = [
  {
    id: "a1",
    clientName: "Клиент",
    interest: "Кухня",
    receivingPartnerId: "p1",
    referrerPartnerId: "viewer",
    updatedAt: "2026-11-10T12:00:00Z",
    referralAt: "2026-11-01T10:00:00Z",
    stageId: "new",
  },
];

const baseProps = {
  partner,
  appeals,
  expanded: false,
  onToggle: vi.fn(),
  partnerPartial: false,
  partnerSelected: false,
  onPartnerSelect: vi.fn(),
  selectedIds: new Set<string>(),
  onClientSelect: vi.fn(),
  personalMeta: {},
  bucket: "active",
  onEditClient: vi.fn(),
  onPartnerOpen: vi.fn(),
  onClientOpen: vi.fn(),
};

describe("P3.ObserverPartnerCard", () => {
  it("exposes four KPI metrics and disclosure toggle labels", () => {
    render(<ObserverPartnerCard {...baseProps} />);
    const card = screen.getByTestId("ca-observer-partner-card");
    const terms = within(card).getAllByRole("term");
    expect(terms.map((t) => t.textContent)).toEqual([
      "Направлено",
      "В работе",
      "С оплатой",
      "Отказы",
    ]);
    expect(within(card).getByText("Показать")).toBeTruthy();
  });

  it("forwards details open state to onToggle", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { container } = render(<ObserverPartnerCard {...baseProps} onToggle={onToggle} />);
    const summary = container.querySelector("summary")!;
    await user.click(summary);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("opens partner page from name control", async () => {
    const user = userEvent.setup();
    const onPartnerOpen = vi.fn();
    render(<ObserverPartnerCard {...baseProps} onPartnerOpen={onPartnerOpen} />);
    await user.click(screen.getByRole("button", { name: "Открыть партнёра: Салон Альфа" }));
    expect(onPartnerOpen).toHaveBeenCalledOnce();
  });
});
