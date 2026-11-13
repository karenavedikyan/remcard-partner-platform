import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerHub } from "./ScannerHub";
import type { OrderCreateResponse, OrderPreviewAllowed } from "@/lib/order-types";
import * as proxy from "@/lib/remcard-proxy";

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));

const searchParams = new URLSearchParams("appealId=ap_scan");
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: vi.fn(() => true),
}));

const USER_ID = "m1fix-store-000000000001";
const CERT_CODE = "RC-E2E-FLOW-001";

const previewAllowed: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "cert-1",
    promoCode: CERT_CODE,
    status: "ACTIVE",
    validUntil: "2030-12-31T00:00:00.000Z",
    usageCount: 0,
    maxUsages: 1,
    userAlias: "Test Client",
    issuer: { label: "PROF", name: "Test Issuer" },
    partnerCards: [],
  },
  partner: { id: "partner-1", storeName: "M1 Test Store", isSelfScan: false },
  availableCategories: [
    { category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 5 },
  ],
};

const orderSuccess: OrderCreateResponse = {
  order: { id: "ord-scan-1" },
  summary: { totalAmount: 1000, discountAmount: 100, issuerBonusAmount: 50, isSelfScan: false },
};

describe("P6 ScannerHub receiving handoff", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(proxy, "isAllowedProxyRoute").mockReturnValue(true);
    searchParams.set("appealId", "ap_scan");
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-2222-4333-8444-555555555555" });
  });

  it("order success, link 500, retry link posts once more store order", async () => {
    let orderPostCount = 0;
    let linkPostCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/pro/client-appeals/ap_scan") && init?.method !== "POST") {
          return new Response(
            JSON.stringify({
              appeal: {
                id: "ap_scan",
                clientDisplayName: "Клиент",
                certificateId: "cert-1",
                certificatePromoCode: CERT_CODE,
                purchaseOrderId: null,
                stageKey: "ws_new",
                createdAt: "2026-01-01T00:00:00Z",
                updatedAt: "2026-01-01T00:00:00Z",
              },
              revision: 2,
              history: [],
              readOnly: false,
              access: { listAllowed: true, mutationsAllowed: true },
            }),
            { status: 200 },
          );
        }
        if (url.includes("/order-link") && init?.method === "POST") {
          linkPostCount += 1;
          if (linkPostCount === 1) {
            return new Response(JSON.stringify({ error: "fail", code: "ERROR" }), { status: 500 });
          }
          return new Response(
            JSON.stringify({
              appealId: "ap_scan",
              orderId: "ord-scan-1",
              revision: 3,
              alreadyLinked: false,
            }),
            { status: 200 },
          );
        }
        if (url.includes("/api/store/orders")) {
          return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        if (
          url.includes("/api/store/order") &&
          !url.includes("/preview") &&
          init?.method === "POST"
        ) {
          orderPostCount += 1;
          return new Response(JSON.stringify(orderSuccess), { status: 201 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    render(<ScannerHub userId={USER_ID} />);
    await screen.findByTestId("ca-scanner-receiving-context-ready");

    await user.type(screen.getByLabelText(/код или промокод/i), CERT_CODE);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByRole("heading", { name: /оформление покупки/i });
    const amountInput = screen.getByLabelText(/сумма покупки до скидки/i);
    await user.clear(amountInput);
    await user.type(amountInput, "1000");
    const confirmButtons = screen.getAllByRole("button", { name: /подтвердить покупку/i });
    await user.click(confirmButtons[0]!);
    if (confirmButtons.length > 1) {
      await user.click(confirmButtons[confirmButtons.length - 1]!);
    }

    await screen.findByText(/покупка подтверждена/i);
    await screen.findByTestId("ca-scanner-receiving-link-failed");
    expect(orderPostCount).toBe(1);

    await user.click(screen.getByRole("button", { name: /повторить привязку/i }));
    await waitFor(() => expect(screen.getByTestId("ca-scanner-receiving-link-linked")).toBeTruthy());
    expect(orderPostCount).toBe(1);
    expect(linkPostCount).toBe(2);
  });

  it("empty appealId query fails closed without ordinary scanner", async () => {
    searchParams.set("appealId", "   ");
    render(<ScannerHub userId={USER_ID} />);
    expect(await screen.findByTestId("ca-scanner-receiving-context-invalid")).toBeTruthy();
    expect(screen.queryByLabelText(/код или промокод/i)).toBeNull();
  });
});
