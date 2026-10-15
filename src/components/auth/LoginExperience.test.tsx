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
}));

vi.mock("./AuthFlow", () => ({
  AuthFlow: ({ returnTo }: { returnTo?: string | null }) => (
    <div data-testid="auth-flow-mounted" data-return-to={returnTo ?? ""}>
      AuthFlow
    </div>
  ),
}));

vi.mock("./AdminPasswordLoginForm", () => ({
  AdminPasswordLoginForm: () => <div data-testid="admin-password-form">Admin form</div>,
}));

import { fetchProfAdminCapabilities } from "@/lib/prof-admin-api";

describe("LoginExperience admin login race", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    replace.mockClear();
  });

  it("keeps admin intent while capabilities pending and never mounts AuthFlow", async () => {
    let resolveCaps!: (v: { adminPasswordLogin: boolean; adminTestUsers: boolean }) => void;
    vi.mocked(fetchProfAdminCapabilities).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCaps = resolve;
        }),
    );

    render(
      <LoginExperience initialMode="admin" returnTo="/admin/test-users" />,
    );

    expect(screen.getByTestId("admin-login-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-flow-mounted")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Вход администратора" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    resolveCaps({ adminPasswordLogin: true, adminTestUsers: true });

    await waitFor(() => {
      expect(screen.getByTestId("admin-password-form")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("auth-flow-mounted")).not.toBeInTheDocument();
  });

  it("shows fail-closed state when capabilities disable admin login", async () => {
    vi.mocked(fetchProfAdminCapabilities).mockResolvedValue({
      adminPasswordLogin: false,
      adminTestUsers: false,
    });

    render(<LoginExperience initialMode="admin" returnTo="/admin/test-users" />);

    expect(await screen.findByTestId("admin-login-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-flow-mounted")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows fail-closed state on capabilities error", async () => {
    vi.mocked(fetchProfAdminCapabilities).mockRejectedValue(new Error("network"));

    render(<LoginExperience initialMode="admin" returnTo="/admin/test-users" />);

    expect(await screen.findByTestId("admin-login-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-flow-mounted")).not.toBeInTheDocument();
  });

  it("mounts partner AuthFlow when partner tab is explicit", async () => {
    vi.mocked(fetchProfAdminCapabilities).mockResolvedValue({
      adminPasswordLogin: true,
      adminTestUsers: true,
    });

    render(<LoginExperience initialMode="partner" returnTo="/scanner" />);

    expect(await screen.findByTestId("auth-flow-mounted")).toBeInTheDocument();
  });

  it("unmounts AuthFlow when switching partner to admin after capabilities load", async () => {
    vi.mocked(fetchProfAdminCapabilities).mockResolvedValue({
      adminPasswordLogin: true,
      adminTestUsers: true,
    });

    render(<LoginExperience initialMode="partner" returnTo="/admin/test-users" />);

    expect(await screen.findByTestId("auth-flow-mounted")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Вход администратора" }));

    expect(screen.queryByTestId("auth-flow-mounted")).not.toBeInTheDocument();
    expect(screen.getByTestId("admin-password-form")).toBeInTheDocument();
  });
});
