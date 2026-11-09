import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerHub } from "./ScannerHub";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import {
  STORE_ORDER_ATTEMPT_STORAGE_KEY,
  loadStoreOrderAttempt,
} from "@/lib/store-order-attempt";
import type { OrderPreviewAllowed } from "@/lib/order-types";

vi.mock("./QrScanner", () => ({
  QrScanner: () => null,
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,MOCK"),
  },
}));

import { confirmScannerPurchaseThroughReview } from "./scanner-test-flow";

const USER_ID = "staff-scanner-user-001";
const CERT = "RC-BRANCH-FLOW";

const previewAllowed: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "c1",
    promoCode: CERT,
    status: "ACTIVE",
    validUntil: null,
    usageCount: 0,
    maxUsages: 1,
    userAlias: null,
    issuer: { label: "PROF", name: "Issuer" },
    partnerCards: [],
  },
  partner: { id: "p1", storeName: "Store", isSelfScan: true },
  availableCategories: [
    { category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 5 },
  ],
};

function staffContextSix(): ProContextSnapshot {
  const branches = [
    { id: "br_krd_rostov", name: "Ростов", city: "Краснодар" },
    { id: "br_krd_40let", name: "40 лет", city: "Краснодар" },
    { id: "br_krd_partizan", name: "Партизан", city: "Краснодар" },
    { id: "br_krd_novoross", name: "Новоросс", city: "Краснодар" },
    { id: "br_nvr_isaeva", name: "Исаева", city: "Новороссийск" },
  ];
  return {
    role: "BRANCH_EMPLOYEE",
    membershipKind: "HEAD_OFFICE",
    organization: { id: "org", name: "ОПТОВИК", partnerType: "STORE" },
    branches,
    activeBranch: branches[0]!,
    branchAssignments: branches.map((b) => ({
      branchId: b.id,
      status: "ACTIVE" as const,
      effectivePermissions: { canActivateCertificates: true },
    })),
    effectivePermissions: { canActivateCertificates: true },
  };
}

function renderWithContext(proContext: ProContextSnapshot | null, role = "CLIENT") {
  const user = { id: USER_ID, role, displayName: "Staff" } as AuthUser;
  const value = cabinetPresentationFixture(user, proContext, true);
  return render(
    <CabinetPresentationProvider value={value}>
      <ScannerHub userId={USER_ID} />
    </CabinetPresentationProvider>,
  );
}

describe("ScannerHub branch operation context", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000001" });
  });

  it("sends default active branch on search without manual pick", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      if (url.includes("/preview")) {
        return new Response(JSON.stringify(previewAllowed), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });

    const user = userEvent.setup();
    renderWithContext(staffContextSix());
    await user.type(screen.getByLabelText(/код или промокод/i), CERT);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/введите суммы покупки/i);
    expect(calls.some((u) => u.includes("branchId=br_krd_rostov"))).toBe(true);
    expect(screen.getByTestId("scanner-confirmation-branch")).toHaveTextContent(/филиал операции/i);
    expect(screen.getByTestId("scanner-confirmation-branch")).toHaveTextContent(/ростов/i);
  });

  it("sends the same branchId query on preview and order after operating branch change", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/preview")) {
        return new Response(JSON.stringify(previewAllowed), { status: 200 });
      }
      if (url.includes("/api/store/order") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            order: { id: "ord-1" },
            summary: { totalAmount: 1000, discountAmount: 100, isSelfScan: true },
          }),
          { status: 201 },
        );
      }
      return new Response("{}", { status: 404 });
    });

    const user = userEvent.setup();
    renderWithContext(staffContextSix());

    await user.selectOptions(screen.getByLabelText(/филиал операции/i), "br_krd_partizan");
    await user.type(screen.getByLabelText(/код или промокод/i), CERT);
    await user.click(screen.getByRole("button", { name: /найти/i }));

    await confirmScannerPurchaseThroughReview(user, "1000");

    await waitFor(() => {
      expect(calls.filter((c) => c.url.includes("branchId=br_krd_partizan"))).toHaveLength(2);
    });
    const previewUrl = calls.find((c) => c.url.includes("/preview"))?.url ?? "";
    const orderUrl = calls.find((c) => c.init?.method === "POST" && c.url.includes("/order"))?.url ?? "";
    expect(previewUrl).toContain("branchId=br_krd_partizan");
    expect(orderUrl).toContain("branchId=br_krd_partizan");
  });

  it("auto-selects single accessible branch in query", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      if (url.includes("/preview")) {
        return new Response(JSON.stringify(previewAllowed), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });

    const ctx = staffContextSix();
    const only = ctx.branches![0]!;
    renderWithContext({
      ...ctx,
      branches: [only],
      branchAssignments: [
        { branchId: only.id, status: "ACTIVE", effectivePermissions: { canActivateCertificates: true } },
      ],
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/код или промокод/i), CERT);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/введите суммы покупки/i);
    expect(calls.some((u) => u.includes(`branchId=${only.id}`))).toBe(true);
  });

  it("owner context sends no branchId query", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      if (url.includes("/preview")) {
        return new Response(JSON.stringify(previewAllowed), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });

    renderWithContext(
      { role: "ORG_OWNER", organization: { id: "o", name: "O" }, branches: [] },
      "PRO",
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/код или промокод/i), CERT);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/введите суммы покупки/i);
    expect(calls.some((u) => u.includes("branchId="))).toBe(false);
  });

  it("legacy attempt without branch blocks retry", async () => {
    sessionStorage.setItem(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        userId: USER_ID,
        idempotencyKey: "legacy-key",
        body: { certificateCode: CERT, items: [{ category: "doors", amount: 1000 }] },
        status: "unknown",
      }),
    );
    renderWithContext(staffContextSix());
    expect(await screen.findByText(/сохранённая попытка создана до выбора филиала/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /проверить результат/i })).toBeNull();
  });

  it("retry reuses stored branchId", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push(url);
      if (init?.method === "POST" && url.includes("/order")) {
        return new Response(JSON.stringify({ order: { id: "o1" }, summary: { totalAmount: 1, discountAmount: 0, isSelfScan: true } }), {
          status: 201,
        });
      }
      return new Response("{}", { status: 404 });
    });
    sessionStorage.setItem(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        userId: USER_ID,
        idempotencyKey: "retry-key",
        branchId: "br_krd_40let",
        body: { certificateCode: CERT, items: [{ category: "doors", amount: 1000 }] },
        status: "unknown",
      }),
    );
    renderWithContext(staffContextSix());
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /проверить результат/i }));
    await waitFor(() =>
      expect(
        calls.some((u) => u.includes("/api/store/order") && u.includes("branchId=br_krd_40let")),
      ).toBe(true),
    );
  });
});
