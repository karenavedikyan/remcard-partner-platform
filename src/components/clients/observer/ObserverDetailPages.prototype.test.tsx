import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ObserverClientDetailView } from "./ObserverClientDetailView";
import { ObserverPartnerDetailView } from "./ObserverPartnerDetailView";

const appeal = {
  id: "appeal-1",
  clientName: "Борис Ким",
  interest: "Шкаф",
  certificateId: "cert-1",
  receivingPartnerId: "rp1",
  referrerPartnerId: "me",
  updatedAt: "2026-11-14T09:00:00.000Z",
  referralAt: "2026-11-12T10:00:00.000Z",
  stageId: "sys_paid",
  stageLabel: "Оплачено",
} as never;
const partner = { id: "rp1", name: "РемТех на Ленина", city: "Казань", category: "Ремонт" } as never;

describe("observer partner and client pages use the prototype classes", () => {
  it("partner page: back to partners, title, meta line, rows in ca-observer-client-rows", () => {
    const onBack = vi.fn();
    const { container } = render(
      <ObserverPartnerDetailView
        partner={partner}
        appeals={[appeal]}
        selectedIds={new Set()}
        onBack={onBack}
        onClientOpen={vi.fn()}
        onClientSelect={vi.fn()}
      />,
    );
    expect(screen.getByTestId("ca-clients-back")).toHaveTextContent("К партнёрам");
    expect(screen.getByRole("heading", { name: "РемТех на Ленина" })).toBeInTheDocument();
    expect(container.querySelector(".ca-observer-partner-head")).toHaveTextContent("Ремонт · Казань");
    const rows = container.querySelector(".ca-observer-client-rows");
    expect(rows).not.toBeNull();
    expect(within(rows as HTMLElement).getAllByTestId("ca-observer-client-row")).toHaveLength(1);
    expect(container.innerHTML).not.toMatch(/observer_|_section_|_partnerPageHead/);
  });

  it("client page: «Кратко» list, public timeline without internal notes, badge next to the name", () => {
    const { container } = render(
      <ObserverClientDetailView
        status="ready"
        appeal={appeal}
        partner={partner}
        publicTimeline={[
          { at: "2026-11-12T10:00:00.000Z", text: "Создано обращение по сертификату" },
          { at: "2026-11-13T10:00:00.000Z", text: "Оплачено" },
        ]}
        purchase={{ amountKopecks: 8_400_000, note: "Сумма покупки у партнёра" }}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: /Борис Ким/ }).nextElementSibling).toHaveTextContent("Оплачено");
    expect(container.querySelector("dl.ca-dl")).not.toBeNull();
    expect(screen.getByTestId("ca-observer-client-purchase")).toHaveTextContent("84");
    expect(screen.getByTestId("ca-observer-certificate")).toHaveTextContent("Выдан вами");
    expect(screen.getByRole("heading", { name: "Хронология (без внутренних заметок партнёра)" })).toBeInTheDocument();
    expect(container.querySelectorAll("ol.ca-timeline > li.ca-tl-item")).toHaveLength(2);
    expect(container.innerHTML).not.toMatch(/observer_|_section_|_partnerPageHead|_detailGrid/);
  });
});
