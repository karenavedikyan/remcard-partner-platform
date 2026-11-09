import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerHub } from "./ScannerHub";
import { confirmScannerPurchaseThroughReview } from "./scanner-test-flow";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import type { OrderPreviewAllowed } from "@/lib/order-types";

vi.mock("./QrScanner", () => ({
  QrScanner: () => null,
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,MOCK"),
  },
}));

const USER_ID = "m1fix-store-000000000001";
const CERT_CODE = "RC-REVIEW-FLOW-001";

const previewAllowed: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "cert-review",
    promoCode: CERT_CODE,
    status: "ACTIVE",
    validUntil: "2030-12-31T00:00:00.000Z",
    usageCount: 0,
    maxUsages: 3,
    userAlias: "Review Client",
    issuer: { label: "PROF", name: "Issuer Org" },
    partnerCards: [],
  },
  partner: {
    id: "partner-1",
    storeName: "Review Store",
    isSelfScan: false,
  },
  availableCategories: [
    {
      category: "doors",
      categoryLabel: "Двери",
      discountPercent: 10,
      issuerPercent: 5,
    },
    {
      category: "hardware",
      categoryLabel: "Фурнитура",
      discountPercent: 5,
      issuerPercent: 2,
    },
  ],
};

function renderScanner() {
  const value = cabinetPresentationFixture(
    {
      id: USER_ID,
      role: "PRO",
      displayName: "Owner",
      city: "C",
      specializations: [],
      publicId: "RC1",
      partnerType: "STORE",
    },
    { role: "ORG_OWNER", organization: { id: "org", name: "Org" }, branches: [] },
    true,
  );
  return render(
    <CabinetPresentationProvider value={value}>
      <ScannerHub userId={USER_ID} />
    </CabinetPresentationProvider>,
  );
}

describe("ScannerHub purchase review", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("crypto", {
      randomUUID: () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
  });

  it("opens review without POST and posts exactly once on modal confirm", async () => {
    let orderPosts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
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
          orderPosts += 1;
          return new Response(
            JSON.stringify({
              order: { id: "ord-review-1" },
              summary: {
                totalAmount: 1000,
                discountAmount: 100,
                issuerBonusAmount: 50,
                isSelfScan: false,
              },
            }),
            { status: 201 },
          );
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    renderScanner();
    await user.type(screen.getByLabelText(/код или промокод/i), CERT_CODE);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/введите суммы покупки/i);

    const openButtons = () => screen.getAllByRole("button", { name: /^подтвердить покупку$/i });

    await user.clear(screen.getAllByLabelText(/сумма покупки до скидки/i)[0]!);
    await user.type(screen.getAllByLabelText(/сумма покупки до скидки/i)[0]!, "1000");
    await user.click(openButtons()[0]!);

    expect(orderPosts).toBe(0);
    expect(screen.getByTestId("purchase-review-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("purchase-review-due")).toHaveTextContent(/900/);

    await user.click(screen.getByTestId("purchase-review-confirm"));
    await screen.findByText(/покупка подтверждена/i);
    expect(orderPosts).toBe(1);
  });

  it("Escape closes review and preserves amount inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    renderScanner();
    await user.type(screen.getByLabelText(/код или промокод/i), CERT_CODE);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/введите суммы покупки/i);

    const amountInput = screen.getAllByLabelText(/сумма покупки до скидки/i)[0]!;
    await user.type(amountInput, "2500");

    const [openReview] = screen.getAllByRole("button", { name: /^подтвердить покупку$/i });
    await user.click(openReview);
    await screen.findByTestId("purchase-review-dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByTestId("purchase-review-dialog")).not.toBeInTheDocument();
    });
    expect(amountInput).toHaveValue(2500);
  });

  it("shows changed reward days in review after summary edit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    renderScanner();
    await user.type(screen.getByLabelText(/код или промокод/i), CERT_CODE);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/введите суммы покупки/i);

    await user.type(screen.getAllByLabelText(/сумма покупки до скидки/i)[0]!, "1000");

    const rewardSummary = screen.getByTestId("reward-terms-doors");
    await user.click(rewardSummary.querySelector("summary")!);
    const daysInput = screen.getByTestId("reward-days-doors");
    await user.clear(daysInput);
    await user.type(daysInput, "30");

    const [openReview] = screen.getAllByRole("button", { name: /^подтвердить покупку$/i });
    await user.click(openReview);
    await screen.findByTestId("purchase-review-dialog");

    expect(screen.getByTestId("purchase-review-body")).toHaveTextContent(/30 дней/);
  });
});
