import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminLoginModal } from "./AdminLoginModal";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/prof-admin-api", () => ({
  adminPasswordLogin: vi.fn(),
}));

import { adminPasswordLogin } from "@/lib/prof-admin-api";

describe("AdminLoginModal focus and auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("traps Tab within dialog and restores focus on Escape", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "open";
    document.body.append(trigger);
    trigger.focus();

    const onClose = vi.fn();
    const ui = userEvent.setup();
    render(
      <AdminLoginModal open adminCaps="enabled" onClose={onClose} returnTo="/admin/test-users" />,
    );

    const dialog = await screen.findByTestId("admin-login-modal");
    expect(dialog).toHaveAttribute("open");

    const loginInput = screen.getByTestId("admin-login-input");
    await waitFor(() => {
      expect(loginInput).toHaveFocus();
    });

    await ui.tab();
    expect(screen.getByTestId("admin-password-input")).toHaveFocus();
    await ui.tab();
    await ui.tab();
    await ui.tab();
    expect(screen.getByTestId("admin-login-close")).toHaveFocus();
    await ui.tab();
    expect(loginInput).toHaveFocus();

    await ui.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByTestId("admin-login-close")).toHaveFocus();

    await ui.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
    trigger.remove();
  });

  it("closes on backdrop interaction via cancel handler", async () => {
    const onClose = vi.fn();
    render(<AdminLoginModal open adminCaps="enabled" onClose={onClose} />);
    await screen.findByTestId("admin-login-modal");
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  it("shows admin auth error from API mock", async () => {
    const { RemcardApiError } = await import("@/lib/api-client");
    vi.mocked(adminPasswordLogin).mockRejectedValue(new RemcardApiError(401, "Неверный логин или пароль.", null));

    const ui = userEvent.setup();
    render(<AdminLoginModal open adminCaps="enabled" onClose={vi.fn()} />);

    await ui.type(screen.getByTestId("admin-login-input"), "bad");
    await ui.type(screen.getByTestId("admin-password-input"), "password1");
    await ui.click(screen.getByRole("button", { name: /^войти$/i }));

    expect(await screen.findByText(/неверный логин или пароль/i)).toBeInTheDocument();
  });

  it("calls onClose after successful admin login mock", async () => {
    vi.mocked(adminPasswordLogin).mockResolvedValue(undefined);
    const onClose = vi.fn();
    const ui = userEvent.setup();
    render(<AdminLoginModal open adminCaps="enabled" onClose={onClose} returnTo="/admin/test-users" />);

    await ui.type(screen.getByTestId("admin-login-input"), "admin");
    await ui.type(screen.getByTestId("admin-password-input"), "password1");
    await ui.click(screen.getByRole("button", { name: /^войти$/i }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(replace).toHaveBeenCalledWith("/admin/test-users");
  });
});
