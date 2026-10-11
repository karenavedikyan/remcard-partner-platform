import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountSessionActions } from "./AccountSessionActions";
import { remcardFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("./LogoutButton", () => ({
  LogoutButton: () => <button type="button">Выйти</button>,
}));

describe("AccountSessionActions", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("opens confirm dialog and calls sign-out-all endpoint", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({ ok: true });

    const user = userEvent.setup();
    render(<AccountSessionActions />);

    await user.click(screen.getByTestId("sign-out-all-devices"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/на всех устройствах, включая это/i)).toBeTruthy();

    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Выйти со всех устройств" }),
    );
    expect(remcardFetch).toHaveBeenCalledWith("/api/auth/sign-out-all-sessions", {
      method: "POST",
      body: {},
    });
  });
});
