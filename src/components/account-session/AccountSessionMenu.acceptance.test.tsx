import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ current: vi.fn(), all: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/lib/account-session-exit", () => ({
  ACCOUNT_SESSION_BROADCAST: "review-session-exit",
  clearLocalSessionArtifacts: vi.fn(async () => {}),
  notifyAccountSessionExit: vi.fn(),
  postLogoutCurrentDevice: mocks.current,
  postLogoutAllDevices: mocks.all,
  tryBeginAccountExit: vi.fn(() => true),
  endAccountExit: vi.fn(),
}));
import { AccountSessionMenu } from "./AccountSessionMenu";

describe("Independent account menu acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.current.mockResolvedValue(undefined);
    mocks.all.mockResolvedValue(undefined);
  });

  function open() {
    render(<AccountSessionMenu displayName="Тестовый агент" roleLabel="Агент" />);
    fireEvent.click(screen.getByTestId("account-menu-trigger"));
  }

  it("current logout posts and only then navigates", async () => {
    open();
    fireEvent.click(screen.getByTestId("account-logout"));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/account/signed-out?scope=current"));
    expect(mocks.current).toHaveBeenCalledTimes(1);
    expect(mocks.all).not.toHaveBeenCalled();
  });

  it("cancelling global exit makes no request", () => {
    open();
    fireEvent.click(screen.getByTestId("account-logout-all"));
    fireEvent.click(screen.getByTestId("logout-all-cancel"));
    expect(mocks.all).not.toHaveBeenCalled();
    expect(mocks.current).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("confirmed global exit uses all endpoint", async () => {
    open();
    fireEvent.click(screen.getByTestId("account-logout-all"));
    fireEvent.click(screen.getByTestId("logout-all-confirm"));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/account/signed-out?scope=all"));
    expect(mocks.all).toHaveBeenCalledTimes(1);
  });

  it("failed current exit must show an error and not navigate", async () => {
    mocks.current.mockRejectedValue(new Error("review offline"));
    open();
    fireEvent.click(screen.getByTestId("account-logout"));
    await waitFor(() => expect(mocks.current).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Не удалось выйти"));
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
