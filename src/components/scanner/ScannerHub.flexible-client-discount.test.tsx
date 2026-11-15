import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerHub } from "./ScannerHub";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import type { OrderPreviewAllowed } from "@/lib/order-types";

vi.mock("./QrScanner", () => ({
  QrScanner: () => null,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("./useReceivingAppealScannerHandoff", () => {
  const handoff = {
    blocksOrdinaryCheckout: false,
    crmReadOnlyNotice: null,
    crmGateRetryError: null,
    certEntryError: null,
    certEntryPending: false,
    appealInvalid: false,
    appealScoped: false,
    allowsNewStoreOrder: true,
    ordinaryAppealRequired: false,
    ordinaryAppealIntegrationRequired: false,
    requiresAppealReady: false,
    appealId: null,
    certificatePrefillCode: null,
    context: { status: "idle" as const },
    discardOrdinarySession: () => undefined,
    prepareOrderAttemptScope: () => undefined,
    persistOrdinaryAppealBinding: () => true,
    assertPreviewAllowed: () => null,
    ensureOrdinaryAppealContext: async () => ({ ok: true as const }),
    restoreOrdinaryAppealForStoredAttempt: async () => ({ ok: true as const }),
  };
  return { useReceivingAppealScannerHandoff: () => handoff };
});

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,MOCK"),
  },
}));

const USER_ID = "m1fix-store-000000000001";
const CERT_CODE = "RC-FLEX-DISC-001";

const previewAllowed: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "cert-flex",
    promoCode: CERT_CODE,
    status: "ACTIVE",
    validUntil: "2030-12-31T00:00:00.000Z",
    usageCount: 0,
    maxUsages: 3,
    userAlias: "Flex Client",
    issuer: { label: "PROF", name: "Issuer Org" },
    partnerCards: [],
  },
  partner: {
    id: "partner-1",
    storeName: "Flex Store",
    isSelfScan: false,
  },
  availableCategories: [
    {
      category: "doors",
      categoryLabel: "Двери",
      discountPercent: 7,
      issuerPercent: 3,
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

async function openPreview(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/код или промокод/i), CERT_CODE);
  await user.click(screen.getByRole("button", { name: /найти/i }));
  await screen.findByText(/введите суммы покупки/i);
}

describe("ScannerHub flexible client discount", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("crypto", {
      randomUUID: () => "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    });
  });

  it("review line uses chosen 6% (600 ₽) not certificate offer 7%", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    renderScanner();
    await openPreview(user);

    await user.clear(screen.getByLabelText(/сумма покупки до скидки/i));
    await user.type(screen.getByLabelText(/сумма покупки до скидки/i), "10000");
    await user.clear(screen.getByLabelText(/скидка клиенту/i));
    await user.type(screen.getByLabelText(/скидка клиенту/i), "6");

    await user.click(screen.getByRole("button", { name: /^подтвердить покупку$/i }));
    await screen.findByTestId("purchase-review-dialog");

    expect(screen.getByTestId("purchase-review-due")).toHaveTextContent(/9\s*400/);
    expect(screen.getByTestId("purchase-review-line-discount-doors")).toHaveTextContent(/600/);
    expect(screen.getByTestId("purchase-review-offer-doors")).toHaveTextContent(/7\s*%/);
  });

  it("first POST carries items[0].discountPercent from chosen draft", async () => {
    let firstPostBody: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        if (
          url.includes("/api/store/order") &&
          !url.includes("/preview") &&
          init?.method === "POST"
        ) {
          firstPostBody = JSON.parse(String(init.body));
          return new Response(
            JSON.stringify({
              order: { id: "ord-flex-1" },
              summary: {
                totalAmount: 10000,
                discountAmount: 600,
                issuerBonusAmount: 300,
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
    await openPreview(user);

    await user.type(screen.getByLabelText(/сумма покупки до скидки/i), "10000");
    await user.type(screen.getByLabelText(/скидка клиенту/i), "6");

    await user.click(screen.getByRole("button", { name: /^подтвердить покупку$/i }));
    await screen.findByTestId("purchase-review-dialog");
    await user.click(screen.getByTestId("purchase-review-confirm"));

    await screen.findByText(/покупка подтверждена/i);
    const body = firstPostBody as { items: Array<{ discountPercent?: number }> };
    expect(body.items[0]?.discountPercent).toBe(6);
  });

  it("invalid 101% blocks review dialog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    renderScanner();
    await openPreview(user);

    await user.type(screen.getByLabelText(/сумма покупки до скидки/i), "10000");
    await user.type(screen.getByLabelText(/скидка клиенту/i), "101");

    await user.click(screen.getByRole("button", { name: /^подтвердить покупку$/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("purchase-review-dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/0–100%/)).toBeInTheDocument();
  });
});