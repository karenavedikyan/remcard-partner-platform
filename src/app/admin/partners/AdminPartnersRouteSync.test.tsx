import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";

function lastRegistryRegistration(): string | null {
  const calls = api.fetchPartnerRegistry.mock.calls;
  if (calls.length === 0) return null;
  const params = calls[calls.length - 1][0] as URLSearchParams;
  return params.get("registration");
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
  api.fetchPartnerRegistry.mockResolvedValue({ items: [], total: 0, facets: null, nextCursor: null });
});

describe("AdminPartnersClient URL sync (client navigation)", () => {
  it("applies registration=active when search params change without remounting", async () => {
    const { rerender } = render(<AdminPartnersClient />);
    await waitFor(() => expect(api.fetchPartnerRegistry).toHaveBeenCalled());
    expect(lastRegistryRegistration()).toBeNull();
    expect(screen.getByLabelText("Статус регистрации")).toHaveValue("all");

    nav.params = new URLSearchParams("registration=active");
    rerender(<AdminPartnersClient />);

    await waitFor(() => expect(screen.getByLabelText("Статус регистрации")).toHaveValue("active"));
    await waitFor(() => expect(lastRegistryRegistration()).toBe("active"));
  });

  it("does not revert manual filter when URL query is unchanged", async () => {
    nav.params = new URLSearchParams("registration=active");
    const { rerender } = render(<AdminPartnersClient />);
    await waitFor(() => expect(screen.getByLabelText("Статус регистрации")).toHaveValue("active"));

    fireEvent.change(screen.getByLabelText("Статус регистрации"), { target: { value: "all" } });
    await waitFor(() => expect(lastRegistryRegistration()).toBeNull());

    api.fetchPartnerRegistry.mockClear();
    rerender(<AdminPartnersClient />);
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByLabelText("Статус регистрации")).toHaveValue("all");
    expect(api.fetchPartnerRegistry).not.toHaveBeenCalled();
  });

  it("clears active filter when navigating to registry without registration param", async () => {
    nav.params = new URLSearchParams("registration=active");
    const { rerender } = render(<AdminPartnersClient />);
    await waitFor(() => expect(screen.getByLabelText("Статус регистрации")).toHaveValue("active"));

    nav.params = new URLSearchParams();
    rerender(<AdminPartnersClient />);

    await waitFor(() => expect(screen.getByLabelText("Статус регистрации")).toHaveValue("all"));
    await waitFor(() => expect(lastRegistryRegistration()).toBeNull());
  });
});
