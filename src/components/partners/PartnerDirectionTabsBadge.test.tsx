import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { directionTabCopy } from "@/lib/partner-directions/direction";
import type { PartnershipDirection } from "@/lib/types";
import { PartnerDirectionBadge } from "./PartnerDirectionBadge";
import { PartnerDirectionTabs } from "./PartnerDirectionTabs";

function Harness({ onChange }: { onChange?: (d: PartnershipDirection) => void }) {
  const [value, setValue] = useState<PartnershipDirection>("incoming");
  return (
    <PartnerDirectionTabs
      value={value}
      onChange={(d) => {
        setValue(d);
        onChange?.(d);
      }}
      copy={directionTabCopy("specialist-r04")}
      counts={{ incoming: 3, outgoing: 0 }}
      panelId="panel"
    />
  );
}

describe("PartnerDirectionTabs", () => {
  it("renders labelled tabs with counts and roving tabindex", () => {
    render(<Harness />);
    const incoming = screen.getByRole("tab", { name: /Меня рекомендуют/ });
    const outgoing = screen.getByRole("tab", { name: /Я рекомендую/ });
    expect(incoming).toHaveTextContent("3");
    expect(outgoing).toHaveTextContent("0");
    expect(incoming).toHaveAttribute("aria-selected", "true");
    expect(incoming).toHaveAttribute("tabindex", "0");
    expect(outgoing).toHaveAttribute("tabindex", "-1");
    expect(incoming).toHaveAttribute("aria-controls", "panel");
  });

  it("moves with arrow, End and Home keys and focuses the new tab", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const incoming = screen.getByTestId("partner-direction-tab-incoming");
    incoming.focus();
    fireEvent.keyDown(incoming, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("outgoing");
    expect(document.activeElement).toBe(screen.getByTestId("partner-direction-tab-outgoing"));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("incoming");
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("outgoing");
  });
});

describe("PartnerDirectionBadge", () => {
  it("links a tooltip through aria-describedby on hover/focus and closes on Escape", async () => {
    render(<PartnerDirectionBadge glyph="↓" label="Нас рекомендуют" description="Объяснение направления" />);
    const badge = screen.getByTestId("partner-direction-badge");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await userEvent.hover(badge);
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Объяснение направления");
    expect(badge.getAttribute("aria-describedby")).toBe(tip.id);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("opens by tap and closes by an outside tap", async () => {
    render(
      <div>
        <PartnerDirectionBadge glyph="↑" label="Мы рекомендуем" description="Описание" />
        <button type="button">outside</button>
      </div>,
    );
    await userEvent.click(screen.getByTestId("partner-direction-badge"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
