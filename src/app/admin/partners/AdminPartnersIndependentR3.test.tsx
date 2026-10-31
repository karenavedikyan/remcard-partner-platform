import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import { AdminPartnersClient } from "./AdminPartnersClient";

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));
vi.mock("@/lib/prof-admin-partners-api", () => api);

function seed() {
  api.fetchPartnerRegistry.mockResolvedValue({
    total: 51,
    nextCursor: "next-page-cursor",
    items: [
      {
        id: "synthetic-partner",
        displayName: "Synthetic partner",
        publicId: "synthetic",
        partnerType: "STORE",
        city: "Тестовый город",
        registrationLabel: "DEMO",
        lifecycle: null,
      },
    ],
  });
  api.previewPartnerLifecycle.mockResolvedValue({
    preview: {
      effects: ["Sensitive archive effects"],
      warnings: ["There are dependencies to review"],
      confirmToken: "synthetic-confirm-token",
    },
  });
  api.applyPartnerLifecycle.mockResolvedValue({ ok: true });
}

describe("Independent admin registry acceptance round three", () => {
  it("lets the admin review the preview before the archive mutation is sent", async () => {
    seed();
    render(<AdminPartnersClient />);
    await screen.findByText("Synthetic partner");
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку/ }));
    fireEvent.change(screen.getByPlaceholderText("Причина"), {
      target: { value: "Synthetic archive reason" },
    });
    fireEvent.click(screen.getByRole("button", { name: "В архив проекта" }));
    await waitFor(() => expect(api.previewPartnerLifecycle).toHaveBeenCalled());
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
    expect(await screen.findByText(/Sensitive archive effects/)).toBeVisible();
  });

  it("offers a way to reach the next registry page when nextCursor is present", async () => {
    seed();
    render(<AdminPartnersClient />);
    await screen.findByText("Synthetic partner");
    expect(screen.getByRole("button", { name: "Следующая страница" })).toBeEnabled();
  });
});
