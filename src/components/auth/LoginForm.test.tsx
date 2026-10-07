import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  getAuthMe: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    body: { error?: string } | null;
    constructor(status: number, message: string, body: { error?: string } | null = null) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

import { getAuthMe, remcardFetch } from "@/lib/api-client";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        return { user: { id: "store-1", role: "PRO" } };
      }
      return { ok: true, consentId: "c1" };
    });
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "store-1", role: "PRO" },
    });
  });

  it("requires consents before submit", async () => {
    const ui = userEvent.setup();
    render(<LoginForm returnTo="/scanner" />);

    await ui.type(screen.getByPlaceholderText("000000"), "123456");
    await ui.click(screen.getByRole("button", { name: /войти/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/обязательные соглашения/i);
    expect(remcardFetch).not.toHaveBeenCalled();
  });

  it("submits code and confirms session via auth/me", async () => {
    const ui = userEvent.setup();
    render(<LoginForm returnTo="/scanner" />);

    await ui.click(screen.getByLabelText(/обработку персональных данных/i));
    await ui.click(screen.getByLabelText(/пользовательское соглашение/i));
    await ui.type(screen.getByPlaceholderText("000000"), "123456");
    await ui.click(screen.getByRole("button", { name: /войти/i }));

    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/auth/verify-code", {
        method: "POST",
        body: { code: "123456" },
      });
    });
    expect(getAuthMe).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/scanner");
  });
});
