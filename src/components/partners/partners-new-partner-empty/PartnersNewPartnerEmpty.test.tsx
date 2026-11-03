import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  partnersNewPartnerEmptyCopy,
  resolvePartnersNewPartnerEmptyRole,
} from "./copy";
import { PartnersNewPartnerEmpty } from "./PartnersNewPartnerEmpty";

describe("partnersNewPartnerEmptyCopy", () => {
  it("maps supported audiences to roles", () => {
    expect(resolvePartnersNewPartnerEmptyRole("agent-r04")).toBe("agent");
    expect(resolvePartnersNewPartnerEmptyRole("specialist-r04")).toBe("specialist");
    expect(resolvePartnersNewPartnerEmptyRole("business-store-r04")).toBe("store");
    expect(resolvePartnersNewPartnerEmptyRole("business-company-r04")).toBe("company");
    expect(resolvePartnersNewPartnerEmptyRole("legacy")).toBeNull();
    expect(resolvePartnersNewPartnerEmptyRole(undefined)).toBeNull();
  });

  it("uses seller copy for store and company", () => {
    for (const role of ["store", "company"] as const) {
      const copy = partnersNewPartnerEmptyCopy(role);
      expect(copy.title).toBe("Партнёры приведут клиентов");
      expect(copy.steps[0].note).toBe("По категориям и городу");
    }
  });

  it("uses recommender copy for agent and specialist", () => {
    for (const role of ["agent", "specialist"] as const) {
      const copy = partnersNewPartnerEmptyCopy(role);
      expect(copy.title).toBe("Соберите сеть партнёров");
      expect(copy.steps[0].note).toBe("Магазины и специалисты по категориям");
    }
  });
});

describe("PartnersNewPartnerEmpty", () => {
  it("renders prototype partners copy for agent and wires CTAs without POST", async () => {
    const onOpenFind = vi.fn();
    const onOpenLink = vi.fn();
    render(
      <PartnersNewPartnerEmpty
        audience="agent-r04"
        onOpenFind={onOpenFind}
        onOpenLink={onOpenLink}
      />,
    );

    expect(screen.getByTestId("partners-empty")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Соберите сеть партнёров/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Посмотреть на примере/i })).toBeNull();

    await userEvent.click(screen.getByTestId("partners-onboarding-cta-find"));
    await userEvent.click(screen.getByTestId("partners-onboarding-cta-link"));
    expect(onOpenFind).toHaveBeenCalledTimes(1);
    expect(onOpenLink).toHaveBeenCalledTimes(1);
  });

  it("renders seller copy for store audience", () => {
    render(
      <PartnersNewPartnerEmpty audience="business-store-r04" onOpenFind={() => {}} onOpenLink={() => {}} />,
    );
    expect(screen.getByRole("heading", { name: /Партнёры приведут клиентов/i })).toBeInTheDocument();
  });

  it("returns null for legacy audience (N/A)", () => {
    const { container } = render(
      <PartnersNewPartnerEmpty audience="legacy" onOpenFind={() => {}} onOpenLink={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("exposes keyboard-focusable primary CTA", () => {
    render(
      <PartnersNewPartnerEmpty audience="specialist-r04" onOpenFind={() => {}} onOpenLink={() => {}} />,
    );
    const primary = screen.getByTestId("partners-onboarding-cta-find");
    primary.focus();
    expect(primary).toHaveFocus();
  });
});
