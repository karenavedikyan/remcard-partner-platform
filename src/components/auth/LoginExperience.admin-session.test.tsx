import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginExperience } from "./LoginExperience";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));
vi.mock("@/components/layout/ThemeToggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/lib/prof-admin-api", () => ({
  fetchProfAdminCapabilities: vi.fn(),
  adminPasswordLogin: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  getAuthMe: vi.fn(),
  remcardFetch: vi.fn(),
  RemcardApiError: class extends Error {},
}));

import { getAuthMe, remcardFetch } from "@/lib/api-client";
import { fetchProfAdminCapabilities } from "@/lib/prof-admin-api";

describe("Admin entry with an existing partner session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", vi.fn());
    vi.mocked(getAuthMe).mockResolvedValue({ user: { id: "partner", role: "PRO" } });
    vi.mocked(remcardFetch).mockResolvedValue({
      nextStep: "ready",
      missingConsents: [],
      needsProfileOnboarding: false,
      canAccessCabinet: true,
      isEmployee: false,
      isAdmin: false,
    });
    vi.mocked(fetchProfAdminCapabilities).mockResolvedValue({
      adminPasswordLogin: true,
      adminTestUsers: true,
    });
  });

  it("keeps the admin dialog open without reusing the partner session or redirecting", async () => {
    render(<LoginExperience initialMode="admin" returnTo="/admin/partners" />);
    expect(await screen.findByTestId("admin-login-modal")).toBeInTheDocument();
    expect(getAuthMe).not.toHaveBeenCalled();
    expect(remcardFetch).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not restart the redirect loop after closing the admin dialog", async () => {
    const user = userEvent.setup();
    render(<LoginExperience initialMode="admin" returnTo="/admin/partners" />);
    await screen.findByTestId("admin-login-modal");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("admin-login-modal")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /с возвращением/i })).toBeInTheDocument();
    expect(getAuthMe).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("preserves automatic session recovery for ordinary partner login", async () => {
    render(<LoginExperience initialMode="partner" returnTo="/scanner" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/scanner"));
    expect(getAuthMe).toHaveBeenCalled();
  });
});
