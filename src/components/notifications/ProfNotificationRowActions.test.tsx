import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfNotificationRowActions } from "./ProfNotificationRowActions";
import type { ProfNotificationItem } from "@/lib/prof-notifications";

function item(url: string | null): ProfNotificationItem {
  return {
    id: "n1",
    type: "test",
    title: "T",
    body: "B",
    url,
    meta: null,
    isRead: false,
    readAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    action: { requiresAction: false, actionLabel: null },
  };
}

describe("ProfNotificationRowActions", () => {
  it("uses the same resolved href for legacy partner routes", () => {
    const { rerender } = render(
      <ProfNotificationRowActions item={item("/pro/partners")} onMarkRead={() => {}} />,
    );
    const link = screen.getByRole("link", { name: "Перейти" });
    expect(link).toHaveAttribute("href", "/partners");

    rerender(
      <ProfNotificationRowActions item={item("/store/partners?tab=1")} onMarkRead={() => {}} />,
    );
    expect(screen.getByRole("link", { name: "Перейти" })).toHaveAttribute(
      "href",
      "/partners?tab=1",
    );
  });

  it("hides Перейти for notification list self-link", () => {
    render(<ProfNotificationRowActions item={item("/notifications")} onMarkRead={() => {}} />);
    expect(screen.queryByRole("link", { name: "Перейти" })).toBeNull();
  });

  it("hides Перейти for untrusted external URLs", () => {
    render(
      <ProfNotificationRowActions
        item={item("https://evil.example/pro/partners")}
        onMarkRead={() => {}}
      />,
    );
    expect(screen.queryByRole("link", { name: "Перейти" })).toBeNull();
  });
});
