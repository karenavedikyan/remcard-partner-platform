import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ObserverPartnerDetailView } from "./ObserverPartnerDetailView";
import {
  OBSERVER_FIXTURE_APPEALS,
  OBSERVER_FIXTURE_PARTNERS,
} from "@/lib/clients-parity/fixtures/observer-demo-fixtures";

describe("ObserverPartnerDetailView", () => {
  it("renders MotionStat KPI labels and values", () => {
    const partner = OBSERVER_FIXTURE_PARTNERS[0];
    const appeals = OBSERVER_FIXTURE_APPEALS.filter((a) => a.receivingPartnerId === partner.id);
    render(
      <ObserverPartnerDetailView
        partner={partner}
        appeals={appeals}
        selectedIds={new Set()}
        onBack={() => undefined}
        onClientOpen={() => undefined}
        onClientSelect={() => undefined}
      />,
    );
    expect(screen.getByText("Направлено")).toBeTruthy();
    expect(screen.getByText("С оплатой")).toBeTruthy();
    const dl = screen.getByRole("list");
    expect(dl.querySelectorAll("dd")[0]?.textContent).toBe(String(appeals.length));
    expect(dl.querySelectorAll("dd")[1]?.textContent).toBe("1");
  });
});
