import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerHub } from "./ScannerHub";
import { confirmScannerPurchaseThroughReview } from "./scanner-test-flow";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import type { OrderCreateResponse, OrderPreviewAllowed } from "@/lib/order-types";

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));
vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,MOCK") },
}));

const USER_ID = "emp-store-000000000001";
const CERT_CODE = "RC-CRM-403-001";

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
  partner: { id: "partner-1", storeName: "Store", isSelfScan: false },
  availableCategories: [
    { category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 5 },
  ],
};

const orderSuccess: OrderCreateResponse = {
  order: { id: "ord-403-001" },
  summary: { totalAmount: 1000, discountAmount: 100, issuerBonusAmount: 50, isSelfScan: false },
};

function renderScanner() {
  const value = cabinetPresentationFixture(
    {
      id: USER_ID,
      role: "PRO",
      displayName: "Seller",
      city: "C",
      specializations: [],
      publicId: "RC2",
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

type Calls = { gate: number; entry: number; order: number };

function stubFetch(opts: { gate: () => Response; entry?: () => Response }): Calls {
  const calls: Calls = { gate: 0, entry: 0, order: 0 };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/pro/client-appeals/certificate-entry")) {
        calls.entry += 1;
        return opts.entry ? opts.entry() : new Response("{}", { status: 404 });
      }
      if (url.includes("/api/pro/client-appeals")) {
        calls.gate += 1;
        return opts.gate();
      }
      if (url.includes("/api/store/orders")) return new Response(JSON.stringify({ orders: [] }), { status: 200 });
      if (url.includes("/api/store/order/preview")) {
        return new Response(JSON.stringify(previewAllowed), { status: 200 });
      }
      if (url.includes("/api/store/order") && init?.method === "POST") {
        calls.order += 1;
        return new Response(JSON.stringify(orderSuccess), { status: 201 });
      }
      return new Response("{}", { status: 404 });
    }),
  );
  return calls;
}

async function previewAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/код или промокод/i), CERT_CODE);
  await user.click(screen.getByRole("button", { name: /найти/i }));
  await confirmScannerPurchaseThroughReview(user, "1000");
}

describe("B1: the scanner never blocks a sale when Clients is unavailable", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: () => "11111111-2222-4333-8444-555555555555" });
  });

  it("CRM gate 403: preview and purchase are available, neutral hint, no bare «Forbidden»", async () => {
    const calls = stubFetch({
      gate: () => new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });
    const user = userEvent.setup();
    renderScanner();
    await previewAndConfirm(user);

    await screen.findByText(/покупка подтверждена/i);
    expect(calls.order).toBe(1);
    expect(calls.entry).toBe(0);
    expect(screen.queryByText(/^forbidden$/i)).not.toBeInTheDocument();
  });

  it("any 403 code from the gate behaves the same (BRANCH_FORBIDDEN)", async () => {
    const calls = stubFetch({
      gate: () => new Response(JSON.stringify({ error: "Forbidden", code: "BRANCH_FORBIDDEN" }), { status: 403 }),
    });
    const user = userEvent.setup();
    renderScanner();
    await previewAndConfirm(user);
    await screen.findByText(/покупка подтверждена/i);
    expect(calls.order).toBe(1);
  });

  it("certificate-entry 403 after an allowed gate also falls back to the legacy sale", async () => {
    const calls = stubFetch({
      gate: () =>
        new Response(
          JSON.stringify({ appeals: [], nextCursor: null, readOnly: false, access: { listAllowed: true, mutationsAllowed: true, denialCode: null } }),
          { status: 200 },
        ),
      entry: () => new Response(JSON.stringify({ error: "Forbidden", code: "BRANCH_FORBIDDEN" }), { status: 403 }),
    });
    const user = userEvent.setup();
    renderScanner();
    await previewAndConfirm(user);
    await screen.findByText(/покупка подтверждена/i);
    expect(calls.entry).toBe(1);
    expect(calls.order).toBe(1);
  });

  it("5xx on the gate keeps the previous behavior (retryable error, no silent fallback)", async () => {
    stubFetch({
      gate: () => new Response(JSON.stringify({ error: "Boom" }), { status: 503 }),
    });
    const user = userEvent.setup();
    renderScanner();
    await user.type(screen.getByLabelText(/код или промокод/i), CERT_CODE);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await waitFor(() => {
      expect(screen.queryByText(/введите суммы покупки/i)).toBeNull();
    });
  });
});
