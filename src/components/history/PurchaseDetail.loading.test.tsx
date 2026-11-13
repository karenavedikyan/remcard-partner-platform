import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseDetail } from "./PurchaseDetail";
import { fetchAccrualRows, fetchPurchaseByOrderId } from "@/lib/history-loader";
import { mapProOrderDetailToPurchase } from "@/lib/history-mappers";
import { cert, purchaseResponse } from "../../../scripts/reward-lifecycle-qa/purchase-fixtures";
import type { AuthUser } from "@/lib/types";
import type { ProOrderDetailResponse } from "@/lib/history-types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/history-loader", () => ({ fetchAccrualRows: vi.fn(), fetchPurchaseByOrderId: vi.fn() }));
vi.mock("@/components/settlements/RewardLifecyclePanel", () => ({
  RewardLifecyclePanel: () => <p>Статус вознаграждения</p>,
}));
const user = { id: "qa-user" } as AuthUser;
const row = mapProOrderDetailToPurchase(purchaseResponse(0) as ProOrderDetailResponse);

describe("full purchase read stays available", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAccrualRows).mockResolvedValue([]);
  });
  it("does not hide purchase if ancillary accrual source fails", async () => {
    vi.mocked(fetchPurchaseByOrderId).mockResolvedValue(row);
    vi.mocked(fetchAccrualRows).mockRejectedValue(new Error("wallet unavailable"));
    const viewer = userEvent.setup();
    render(<PurchaseDetail user={user} purchaseId={cert.orders![0].id} />);
    await waitFor(() => expect(screen.getByText(/Покупка загружена/)).toBeVisible());
    const purchaseContext = screen.getByText(/К оплате за покупку/).closest("p");
    expect(purchaseContext).toHaveTextContent("108 000 ₽");
    expect(screen.getByRole("heading", { name: "Двери", hidden: true })).toBeInTheDocument();
    const breakdown = screen.getByText("Состав и расчёт").closest("summary");
    if (!breakdown) throw new Error("breakdown summary missing");
    await viewer.click(breakdown);
    expect(screen.getByRole("heading", { name: "Двери" })).toBeVisible();
    expect(screen.getByText("Статус вознаграждения")).toBeVisible();
  });
  it("never renders a late previous purchase after navigation to a denied one", async () => {
    let finish!: (value: typeof row) => void;
    vi.mocked(fetchPurchaseByOrderId)
      .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }))
      .mockResolvedValueOnce(null);
    const { rerender } = render(<PurchaseDetail user={user} purchaseId="old" />);
    rerender(<PurchaseDetail user={user} purchaseId="foreign" />);
    await waitFor(() => expect(screen.getByText(/Нет доступа к этой покупке/)).toBeVisible());
    finish(row);
    await waitFor(() => expect(screen.queryByText(/К оплате за покупку/)).toBeNull());
    expect(fetchAccrualRows).not.toHaveBeenCalled();
  });
});
