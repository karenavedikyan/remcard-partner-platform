import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  REWARD_DETAILS_ACCESS_DENIED_HINT,
  REWARD_DETAILS_ACCESS_DENIED_TITLE,
  RewardLifecyclePanel,
} from "./RewardLifecyclePanel";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { RewardResponse } from "@/lib/reward-lifecycle-types";
vi.mock("@/lib/api-client", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/api-client")>(), remcardFetch: vi.fn(),
}));
const fixture = (): RewardResponse => ({
  actorId: "qa-payer",
  permissions: { recipient: false, payerOwner: true, sellerAllowed: true, cash: true, transfer: true, canSuspend: true },
  reward: {
    version: 1, nextConfirmationAt: null,
    summary: { original: 1170000, amount: 1170000, confirmed: 0, pending: 1170000, suspended: 0, paid: 0, review: 0 },
    lines: [{ id: "line-0", categoryLabel: "Двери", days: 14, kind: "GOODS", grossKopecks: 12000000,
      returnedGrossKopecks: 0, fulfilledAt: null, confirmationAt: null, confirmedAt: null, canResume: false,
      originalKopecks: 600000, amount: 600000, confirmed: 0, pending: 600000, suspended: 0, paid: 0, review: 0 }],
    payments: [], history: [],
  },
});
beforeEach(() => {
  localStorage.clear(); vi.resetAllMocks();
  vi.mocked(remcardFetch).mockResolvedValue(fixture());
});
describe("reward lifecycle controls", () => {
  it("shows pending immediately and excludes it from confirmed balance", async () => {
    render(<RewardLifecyclePanel orderId="qa-order" />);
    expect(await screen.findByTestId("reward-pending")).toHaveTextContent(/11\s700,00/);
    expect(screen.getByTestId("reward-confirmed")).toHaveTextContent("0,00");
    expect(screen.queryByRole("button", { name: "Деньги отправлены" })).not.toBeInTheDocument();
  });
  it("handover requires explicit confirmation, CSRF and a persisted idempotency key", async () => {
    const user = userEvent.setup();
    render(<RewardLifecyclePanel orderId="qa-order" />);
    await user.click(await screen.findByRole("button", { name: "Отметить передачу / принятие" }));
    expect(vi.mocked(remcardFetch)).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Подтвердить действие" }));
    await waitFor(() => expect(vi.mocked(remcardFetch)).toHaveBeenCalledTimes(2));
    const [path, options] = vi.mocked(remcardFetch).mock.calls[1];
    expect(path).toContain("qa-order");
    expect(options).toMatchObject({ method: "POST", requireCsrf: true,
      body: { type: "fulfill", lineId: "line-0", fulfilledAt: "ON_OPERATION" } });
    expect(options?.idempotencyKey).toBeTruthy();
  });
  it("an unknown response is retried with the exact same persisted action and key", async () => {
    const user = userEvent.setup();
    vi.mocked(remcardFetch).mockResolvedValueOnce(fixture()).mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(fixture());
    render(<RewardLifecyclePanel orderId="qa-order" />);
    await user.click(await screen.findByRole("button", { name: "Отметить передачу / принятие" }));
    await user.click(screen.getByRole("button", { name: "Подтвердить действие" }));
    const retry = await screen.findByRole("button", { name: "Проверить результат операции" });
    await user.click(retry);
    await waitFor(() => expect(vi.mocked(remcardFetch)).toHaveBeenCalledTimes(3));
    expect(vi.mocked(remcardFetch).mock.calls[2]).toEqual(vi.mocked(remcardFetch).mock.calls[1]);
    expect(localStorage.length).toBe(0);
  });
  it("legacy purchases do not acquire invented individual terms", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({ actorId: "qa-payer", reward: null, permissions: null });
    const { container } = render(<RewardLifecyclePanel orderId="legacy-order" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
  it("corrupted saved attempts fail closed rather than enabling a different financial operation", async () => {
    localStorage.setItem("remcard:reward-attempt:qa-payer:qa-order", "{corrupt");
    render(<RewardLifecyclePanel orderId="qa-order" />);
    const control = await screen.findByRole("button", { name: "Отметить передачу / принятие" });
    expect(control).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Действия заблокированы");
    expect(vi.mocked(remcardFetch)).toHaveBeenCalledTimes(1);
  });

  it("403 GET shows Russian access message, not raw Forbidden or zero-reward success", async () => {
    vi.mocked(remcardFetch).mockRejectedValue(new RemcardApiError(403, "Forbidden"));
    render(<RewardLifecyclePanel orderId="qa-order" />);
    const denied = await screen.findByTestId("reward-lifecycle-access-denied");
    expect(denied).toHaveTextContent(REWARD_DETAILS_ACCESS_DENIED_TITLE);
    expect(denied).toHaveTextContent(REWARD_DETAILS_ACCESS_DENIED_HINT);
    expect(denied).not.toHaveTextContent(/Forbidden/i);
    expect(screen.queryByRole("button", { name: "Повторить" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("reward-confirmed")).toBeNull();
    expect(screen.queryByTestId("reward-pending")).toBeNull();
  });

  it("non-403 load error keeps retry and does not use access-denied copy", async () => {
    const user = userEvent.setup();
    vi.mocked(remcardFetch)
      .mockRejectedValueOnce(new RemcardApiError(500, "Сервер недоступен"))
      .mockResolvedValueOnce(fixture());
    render(<RewardLifecyclePanel orderId="qa-order" />);
    const alert = await screen.findByTestId("reward-lifecycle-load-error");
    expect(alert).toHaveTextContent("Сервер недоступен");
    expect(screen.queryByTestId("reward-lifecycle-access-denied")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByTestId("reward-pending")).toHaveTextContent(/11\s700,00/);
  });
});
