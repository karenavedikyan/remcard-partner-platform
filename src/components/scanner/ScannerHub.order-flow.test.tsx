import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerHub } from "./ScannerHub";
import {
  STORE_ORDER_ATTEMPT_STORAGE_KEY,
  loadStoreOrderAttempt,
} from "@/lib/store-order-attempt";
import type { OrderCreateResponse, OrderPreviewAllowed } from "@/lib/order-types";

vi.mock("./QrScanner", () => ({
  QrScanner: () => null,
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
  partner: {
    id: "partner-1",
    storeName: "M1 Test Store",
    isSelfScan: false,
  },
  availableCategories: [
    {
      category: "doors",
      categoryLabel: "Двери",
      discountPercent: 10,
      issuerPercent: 5,
    },
  ],
};

const orderSuccess: OrderCreateResponse = {
  order: { id: "ord-flow-001" },
  summary: {
    totalAmount: 1000,
    discountAmount: 100,
    issuerBonusAmount: 50,
    isSelfScan: false,
  },
};

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function parseBody(init?: RequestInit): unknown {
  if (!init?.body || typeof init.body !== "string") return null;
  return JSON.parse(init.body) as unknown;
}

function idempotencyKey(init?: RequestInit): string | undefined {
  const headers = init?.headers;
  if (!headers || typeof headers !== "object") return undefined;
  if (headers instanceof Headers) {
    return headers.get("Idempotency-Key") ?? undefined;
  }
  const record = headers as Record<string, string>;
  return record["Idempotency-Key"];
}

async function runPreviewAndConfirm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/код или промокод/i), CERT_CODE);
  await user.click(screen.getByRole("button", { name: /найти/i }));
  await screen.findByText(/оформление покупки/i);

  const amountInput = screen.getByLabelText(/сумма покупки до скидки/i);
  await user.clear(amountInput);
  await user.type(amountInput, "1000");
  await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));
}

describe("ScannerHub order flow (real api-client, mocked fetch)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-2222-4333-8444-555555555555",
    });
  });

  it("keeps attempt on network TypeError and retries with same key/body", async () => {
    const calls: FetchCall[] = [];
    let orderPostCount = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        calls.push({ url, init });
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        if (url.includes("/api/store/order")) {
          orderPostCount += 1;
          if (orderPostCount === 1) {
            throw new TypeError("Failed to fetch");
          }
          return new Response(JSON.stringify(orderSuccess), {
            status: 201,
            headers: { "Idempotent-Replayed": "true" },
          });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    render(<ScannerHub userId={USER_ID} />);
    await runPreviewAndConfirm(user);

    await screen.findByText(/сохранённая попытка покупки/i);
    expect(screen.getByRole("button", { name: /проверить результат/i })).toBeInTheDocument();

    const stored = loadStoreOrderAttempt(USER_ID);
    expect(stored?.idempotencyKey).toBe("11111111-2222-4333-8444-555555555555");
    expect(stored?.body.items[0].amount).toBe(1000);

    await user.click(screen.getByRole("button", { name: /проверить результат/i }));
    await screen.findByText(/покупка подтверждена/i);

    const orderCalls = calls.filter(
      (c) =>
        c.url.includes("/api/store/order") &&
        !c.url.includes("/preview") &&
        c.init?.method === "POST",
    );
    expect(orderCalls).toHaveLength(2);
    expect(idempotencyKey(orderCalls[0].init)).toBe("11111111-2222-4333-8444-555555555555");
    expect(idempotencyKey(orderCalls[1].init)).toBe("11111111-2222-4333-8444-555555555555");
    expect(parseBody(orderCalls[0].init)).toEqual(parseBody(orderCalls[1].init));
  });

  it("RemcardApiError(0) keeps attempt and shows check button", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        if (url.includes("/api/store/order") && init?.method === "POST") {
          return new Response(JSON.stringify({ error: "Сетевая ошибка" }), { status: 0 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    render(<ScannerHub userId={USER_ID} />);
    await runPreviewAndConfirm(user);

    await screen.findByText(/сохранённая попытка покупки/i);
    expect(loadStoreOrderAttempt(USER_ID)?.status).toBe("unknown");
    expect(sessionStorage.getItem(STORE_ORDER_ATTEMPT_STORAGE_KEY)).toContain(
      "11111111-2222-4333-8444-555555555555",
    );
  });

  it("malformed 201 and 504 keep uncertain state with check button", async () => {
    let orderPostCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        if (url.includes("/api/store/order") && init?.method === "POST") {
          orderPostCount += 1;
          if (orderPostCount === 1) {
            return new Response(JSON.stringify({ order: { id: "" }, summary: {} }), { status: 201 });
          }
          return new Response(JSON.stringify({ error: "Gateway Timeout" }), { status: 504 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    render(<ScannerHub userId={USER_ID} />);
    await runPreviewAndConfirm(user);
    await screen.findByRole("button", { name: /проверить результат/i });

    await user.click(screen.getByRole("button", { name: /проверить результат/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /проверить результат/i })).toBeInTheDocument();
    });
    expect(loadStoreOrderAttempt(USER_ID)?.idempotencyKey).toBe(
      "11111111-2222-4333-8444-555555555555",
    );
  });

  it("first-attempt validation 400 clears attempt and keeps form editable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        if (url.includes("/api/store/order") && init?.method === "POST") {
          return new Response(JSON.stringify({ error: "Некорректная сумма" }), { status: 400 });
        }
        return new Response("{}", { status: 404 });
      }),
    );

    const user = userEvent.setup();
    render(<ScannerHub userId={USER_ID} />);
    await runPreviewAndConfirm(user);

    await screen.findByText(/некорректная сумма/i);
    expect(loadStoreOrderAttempt(USER_ID)).toBeNull();
    const amountInput = screen.getByLabelText(/сумма покупки до скидки/i);
    expect(amountInput).not.toBeDisabled();
    await user.clear(amountInput);
    await user.type(amountInput, "500");
    expect(amountInput).toHaveValue(500);
  });
});
