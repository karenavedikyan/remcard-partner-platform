import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerHub } from "./ScannerHub";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import { STORE_ORDER_ATTEMPT_STORAGE_KEY } from "@/lib/store-order-attempt";
import type { OrderPreviewAllowed } from "@/lib/order-types";

vi.mock("./QrScanner", () => ({
  QrScanner: () => null,
}));

const USER_ID = "staff-safety-user-001";
const CERT = "RC-SAFETY-FLOW";

function previewForBranch(marker: string): OrderPreviewAllowed {
  return {
    allowed: true,
    certificate: {
      id: "c1",
      promoCode: `${CERT}-${marker}`,
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
}

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

describe("ScannerHub branch safety", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000002" });
  });

  it("searches with default active branch without manual select", async () => {
    const previews: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/preview")) {
        previews.push(url);
        return new Response(JSON.stringify(previewForBranch("A")), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    const user = userEvent.setup();
    renderWithContext(staffContextSix());
    await user.type(screen.getByLabelText(/код или промокод/i), CERT);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/оформление покупки/i);
    expect(previews.some((u) => u.includes("branchId=br_krd_rostov"))).toBe(true);
  });

  it("restore B does not preview under active default A and shows captured branch label", async () => {
    const previews: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/preview")) {
        previews.push(url);
        return new Response(JSON.stringify({ allowed: false, message: "preview skipped in test" }), {
          status: 200,
        });
      }
      return new Response("{}", { status: 404 });
    });
    sessionStorage.setItem(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        userId: USER_ID,
        idempotencyKey: "restore-b",
        branchId: "br_krd_40let",
        body: { certificateCode: CERT, items: [{ category: "doors", amount: 1000 }] },
        status: "unknown",
      }),
    );
    renderWithContext(staffContextSix());
    expect(await screen.findByRole("button", { name: /проверить результат/i })).toBeInTheDocument();
    expect(screen.getByText(/филиал операции \(зафиксирован\)/i)).toBeInTheDocument();
    expect(screen.getByText(/40 лет/i)).toBeInTheDocument();
    expect(previews.filter((u) => u.includes("branchId=br_krd_rostov"))).toHaveLength(0);
    if (previews.length) {
      expect(previews.every((u) => u.includes("branchId=br_krd_40let"))).toBe(true);
    }
  });

  it("legacy branchless attempt never posts on retry", async () => {
    const posts: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (init?.method === "POST" && url.includes("/order")) {
        posts.push(url);
      }
      return new Response("{}", { status: 404 });
    });
    sessionStorage.setItem(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        userId: USER_ID,
        idempotencyKey: "legacy",
        body: { certificateCode: CERT, items: [{ category: "doors", amount: 1000 }] },
        status: "unknown",
      }),
    );
    renderWithContext(staffContextSix());
    expect(await screen.findByText(/до выбора филиала/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /проверить результат/i })).toBeNull();
    expect(posts).toHaveLength(0);
  });

  it("ignores late preview from previous operating branch", async () => {
    let releaseSlow: ((response: Response) => void) | undefined;
    const slowPreview = new Promise<Response>((resolve) => {
      releaseSlow = resolve;
    });
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/preview") && url.includes("branchId=br_krd_rostov")) {
        return slowPreview;
      }
      if (url.includes("/preview")) {
        return new Response(JSON.stringify(previewForBranch("PARTIZAN")), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    const user = userEvent.setup();
    renderWithContext(staffContextSix());
    await user.type(screen.getByLabelText(/код или промокод/i), CERT);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await user.selectOptions(screen.getByLabelText(/филиал операции/i), "br_krd_partizan");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /найти/i })).toBeEnabled();
    });
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(`${CERT}-PARTIZAN`);
    releaseSlow?.(new Response(JSON.stringify(previewForBranch("ROSTOV-LATE")), { status: 200 }));
    await waitFor(() => {
      expect(screen.queryByText(`${CERT}-ROSTOV-LATE`)).toBeNull();
    });
    expect(screen.getByText(`${CERT}-PARTIZAN`)).toBeInTheDocument();
  });

  it("blocks staff when no permitted branches", async () => {
    const ctx = staffContextSix();
    const blocked: ProContextSnapshot = {
      ...ctx,
      branchAssignments: (ctx.branchAssignments ?? []).map((a) => ({
        ...a,
        effectivePermissions: { canActivateCertificates: false },
      })),
      effectivePermissions: { canActivateCertificates: false },
    };
    const previews: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("/preview")) previews.push(url);
      return new Response("{}", { status: 404 });
    });
    renderWithContext(blocked);
    expect(await screen.findByRole("alert")).toHaveTextContent(/нет филиалов/i);
    const findButton = screen.queryByRole("button", { name: /найти/i });
    if (findButton) {
      expect(findButton).toBeDisabled();
    }
    expect(previews).toHaveLength(0);
  });

  it("owner flow unchanged without branchId query", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(url);
      if (url.includes("/preview")) {
        return new Response(JSON.stringify(previewForBranch("OWNER")), { status: 200 });
      }
      return new Response("{}", { status: 404 });
    });
    const user = userEvent.setup();
    renderWithContext({ role: "ORG_OWNER", organization: { id: "o", name: "O" }, branches: [] }, "PRO");
    await user.type(screen.getByLabelText(/код или промокод/i), CERT);
    await user.click(screen.getByRole("button", { name: /найти/i }));
    await screen.findByText(/оформление покупки/i);
    expect(calls.some((u) => u.includes("branchId="))).toBe(false);
  });
});
