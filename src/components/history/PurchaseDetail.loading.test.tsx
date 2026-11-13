import { render, screen, waitFor } from "@testing-library/react";
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
vi.mock("@/components/settlements/RewardLifecyclePanel", () => ({ RewardLifecyclePanel: () => <p>Статус вознаграждения</p> }));
const user = { id: "qa-user" } as AuthUser;
const row = mapProOrderDetailToPurchase(purchaseResponse(0) as ProOrderDetailResponse);
describe("full purchase read stays available", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(fetchAccrualRows).mockResolvedValue([]); });
  it("does not hide purchase if ancillary accrual source fails", async () => {
    vi.mocked(fetchPurchaseByOrderId).mockResolvedValue(row);
    vi.mocked(fetchAccrualRows).mockRejectedValue(new Error("wallet unavailable"));
    render(<PurchaseDetail user={user} purchaseId={cert.orders![0].id} />);
    await waitFor(() => expect(screen.getByText(/Покупка загружена/)).toBeVisible());
    expect(screen.getByText(/К оплате:/)).toHaveTextContent("108 000 ₽");
    expect(screen.getByText("Двери")).toBeVisible();
    expect(screen.getByText("Статус вознаграждения")).toBeVisible();
  });
  it("never renders a late previous purchase after navigation to a denied one", async () => {
    let finish!: (value: typeof row) => void;
    vi.mocked(fetchPurchaseByOrderId).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce(null);
    const { rerender } = render(<PurchaseDetail user={user} purchaseId="old" />);
    rerender(<PurchaseDetail user={user} purchaseId="foreign" />);
    await waitFor(() => expect(screen.getByText(/Нет доступа к этой покупке/)).toBeVisible());
    finish(row);
    await waitFor(() => expect(screen.queryByText(/К оплате:/)).toBeNull());
    expect(fetchAccrualRows).not.toHaveBeenCalled();
  });
});
