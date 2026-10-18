import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginExperience } from "./LoginExperience";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));

vi.mock("@/lib/prof-admin-api", () => ({
  fetchProfAdminCapabilities: vi.fn(),
  adminPasswordLogin: vi.fn(),
}));

vi.mock("./AuthFlow", () => ({
  AuthFlow: ({ returnTo }: { returnTo?: string | null }) => (
    <div data-testid="auth-flow-mounted" data-return-to={returnTo ?? ""}>
      AuthFlow
    </div>
  ),
}));

import { fetchProfAdminCapabilities } from "@/lib/prof-admin-api";

describe("LoginExperience admin entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    replace.mockClear();
  });

  it("mounts partner AuthFlow and admin link", async () => {
    vi.mocked(fetchProfAdminCapabilities).mockResolvedValue({
      adminPasswordLogin: true,
      adminTestUsers: true,
    });

    render(<LoginExperience initialMode="partner" returnTo="/scanner" />);

    expect(await screen.findByTestId("auth-flow-mounted")).toBeInTheDocument();
    expect(screen.getByTestId("admin-login-open")).toBeInTheDocument();
  });

  it("opens admin modal for admin intent after capabilities load", async () => {
    vi.mocked(fetchProfAdminCapabilities).mockResolvedValue({
      adminPasswordLogin: true,
      adminTestUsers: true,
    });

    render(<LoginExperience initialMode="admin" returnTo="/admin/test-users" />);

    expect(await screen.findByTestId("admin-login-modal")).toBeInTheDocument();
    expect(screen.getByTestId("auth-flow-mounted")).toBeInTheDocument();
  });

  it("shows unavailable state inside modal when admin login disabled", async () => {
    vi.mocked(fetchProfAdminCapabilities).mockResolvedValue({
      adminPasswordLogin: false,
      adminTestUsers: false,
    });

    render(<LoginExperience initialMode="admin" returnTo="/admin/test-users" />);

    expect(await screen.findByTestId("admin-login-modal")).toBeInTheDocument();
    expect(screen.getByTestId("admin-login-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-login-open")).not.toBeInTheDocument();
  });

  it("closes admin modal on Escape", async () => {
    vi.mocked(fetchProfAdminCapabilities).mockResolvedValue({
      adminPasswordLogin: true,
      adminTestUsers: true,
    });

    const ui = userEvent.setup();
    render(<LoginExperience initialMode="admin" returnTo="/admin/test-users" />);
    await screen.findByTestId("admin-login-modal");

    await ui.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByTestId("admin-login-modal")).not.toBeInTheDocument();
    });
  });
});
