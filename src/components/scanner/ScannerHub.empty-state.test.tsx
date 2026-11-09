import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as loadActivity from "@/lib/scanner-empty/load-activity";
import type { ScannerEmptyActivityProbe } from "@/lib/scanner-empty/eligibility";
import type { OrderCreateResponse, OrderPreviewAllowed } from "@/lib/order-types";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import { ScannerHub } from "./ScannerHub";

vi.mock("./QrScanner", () => ({
  QrScanner: () => null,
}));

const USER_ID = "m1fix-store-000000000001";

const previewAllowed: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "cert-1",
    promoCode: "RC-RACE-001",
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

const orderSuccess: OrderCreateResponse = {
  order: { id: "ord-race-001" },
  summary: {
    totalAmount: 1000,
    discountAmount: 100,
    issuerBonusAmount: 50,
    isSelfScan: false,
  },
};

describe("ScannerHub new-partner empty state", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/store/orders")) {
          return new Response(
            JSON.stringify({ orders: [], pagination: { hasMore: false, nextCursor: null } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
      }),
    );
  });

  it("shows pending shell before probe resolves (no hero or welcome)", async () => {
    let resolveProbe!: (probe: ScannerEmptyActivityProbe) => void;
    vi.spyOn(loadActivity, "loadScannerEmptyActivityProbe").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProbe = resolve;
        }),
    );

    renderScanner();
    expect(screen.getByTestId("scanner-welcome-decision-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByText(/Сканируйте QR-код документа/i)).not.toBeInTheDocument();

    resolveProbe({ status: "empty_confirmed" });
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeInTheDocument());
    expect(screen.queryByTestId("scanner-welcome-decision-pending")).not.toBeInTheDocument();
  });

  it("shows onboarding and keeps workbench when store has no purchases", async () => {
    renderScanner();
    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /ввести код/i })).toBeInTheDocument();
    expect(screen.queryByText(/Сканируйте QR-код документа или введите промокод/i)).not.toBeInTheDocument();
  });

  it("hides onboarding when store already has purchases", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/store/orders")) {
          return new Response(
            JSON.stringify({
              orders: [{ orderId: "ord-1", createdAt: "2026-01-01T00:00:00.000Z" }],
              pagination: { hasMore: false, nextCursor: null },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
      }),
    );
    renderScanner();
    expect(await screen.findByText(/Сканируйте QR-код документа/i)).toBeInTheDocument();
    expect(screen.queryByTestId("scanner-welcome-decision-pending")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not show onboarding on 403 store orders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/store/orders")) {
          return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
        }
        return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
      }),
    );
    renderScanner();
    expect(await screen.findByText(/Сканируйте QR-код документа/i)).toBeInTheDocument();
    expect(screen.queryByTestId("scanner-welcome-decision-pending")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("CTA focuses manual scanner without extra POST", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/store/orders")) {
        return new Response(
          JSON.stringify({ orders: [], pagination: { hasMore: false, nextCursor: null } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderScanner();
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeInTheDocument());
    const postsBefore = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST").length;
    await user.click(screen.getByTestId("es-action-scan"));
    const postsAfter = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST").length;
    expect(postsAfter).toBe(postsBefore);
    await waitFor(() => {
      expect(document.getElementById("scanner-manual-code")).toHaveFocus();
    });
  });

  it("ignores late empty probe after order succeeds in the same session", async () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "11111111-2222-4333-8444-555555555555",
    });

    let resolveProbe!: (value: ScannerEmptyActivityProbe) => void;
    vi.spyOn(loadActivity, "loadScannerEmptyActivityProbe").mockImplementation(
      () =>
        new Promise<ScannerEmptyActivityProbe>((resolve) => {
          resolveProbe = resolve;
        }),
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/store/order/preview")) {
          return new Response(JSON.stringify(previewAllowed), { status: 200 });
        }
        if (
          url.includes("/api/store/order") &&
          !url.includes("/api/store/orders") &&
          init?.method === "POST"
        ) {
          return new Response(JSON.stringify(orderSuccess), { status: 201 });
        }
        return new Response(JSON.stringify({ error: "unexpected" }), { status: 404 });
      }),
    );

    const user = userEvent.setup();
    renderScanner();

    await user.type(screen.getByLabelText(/код или промокод/i), "RC-RACE-001");
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/оформление покупки/i);
    const amountInput = screen.getByLabelText(/сумма покупки до скидки/i);
    await user.clear(amountInput);
    await user.type(amountInput, "1000");
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));
    await screen.findByText(/покупка подтверждена/i);

    resolveProbe({ status: "empty_confirmed" });
    await user.click(screen.getByRole("button", { name: /новая покупка/i }));

    expect(await screen.findByText(/Сканируйте QR-код документа/i)).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
