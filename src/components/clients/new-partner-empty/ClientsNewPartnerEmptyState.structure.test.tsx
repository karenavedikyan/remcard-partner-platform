import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClientsNewPartnerEmptyState } from "./ClientsNewPartnerEmptyState";
import buttonStyles from "@/components/ui/Button.module.css";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe("ClientsNewPartnerEmptyState CTA semantics", () => {
  it("uses anchor-as-button for primary (no nested button) and real button for add", () => {
    render(
      <ClientsNewPartnerEmptyState accessMode="agent" onAddClient={() => undefined} />,
    );
    const primary = screen.getByTestId("es-action-recommend");
    expect(primary.tagName).toBe("A");
    expect(primary.querySelector("button")).toBeNull();
    expect(primary.className).toContain(buttonStyles.button);
    expect(primary.className).toContain(buttonStyles.primary);

    const secondary = screen.getByTestId("es-client-add");
    expect(secondary.tagName).toBe("BUTTON");
    expect(secondary.getAttribute("type")).toBe("button");
  });

  it("STORE primary is scan link-as-button with secondary button", () => {
    render(
      <ClientsNewPartnerEmptyState
        accessMode="business"
        businessPartnerType="STORE"
        onAddClient={() => undefined}
      />,
    );
    expect(screen.getByTestId("es-action-scan").tagName).toBe("A");
    expect(screen.getByTestId("es-client-add").tagName).toBe("BUTTON");
  });
});
