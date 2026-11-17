import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScannerHub } from "./ScannerHub";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { AuthUser } from "@/lib/types";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import { confirmScannerPurchaseThroughReview } from "./scanner-test-flow";
import { resolveReceivingScannerCertificateEntryGate } from "@/lib/clients-parity/receiving-appeals-api";

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));
vi.mock("@/lib/clients-parity/receiving-appeals-api", async (orig) => ({
  ...(await orig<typeof import("@/lib/clients-parity/receiving-appeals-api")>()),
  resolveReceivingScannerCertificateEntryGate: vi.fn(async () => ({
    ok: false,
    code: "READ_ONLY",
    message: "read only",
    retryable: false,
  })),
}));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,MOCK") } }));

const USER_ID = "null-contour-user";
const CERT = "RC-IDO9-R";

const previewAllowed: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "c1", promoCode: CERT, status: "ACTIVE", validUntil: null, usageCount: 0, maxUsages: 1, userAlias: null,
    issuer: { label: "PROF", name: "Issuer" }, partnerCards: [],
  },
  partner: { id: "p1", storeName: "Store", isSelfScan: false },
  availableCategories: [{ category: "doors", categoryLabel: "Двери", discountPercent: 10, issuerPercent: 5 }],
};

const org = { id: "org-1", name: "Store", ownerId: "owner-1", partnerType: "STORE" as const };
const rights = (role: string, flags: Record<string, boolean>) => ({ role, flags });

const directEmployee = (r = rights("MANAGER", { canActivateCertificates: true })): ProContextSnapshot => ({
  role: "ORG_EMPLOYEE", organization: org, branches: [], activeBranch: null, rights: r,
} as ProContextSnapshot);

const headOffice = (r = rights("MANAGER", { canActivateCertificates: true })): ProContextSnapshot => ({
  role: "ORG_TEAM_MEMBER", membershipKind: "HEAD_OFFICE", organization: org, branches: [], activeBranch: null,
  branchAssignments: [], rights: r,
} as ProContextSnapshot);

function renderWith(proContext: ProContextSnapshot) {
  const user = { id: USER_ID, role: "CLIENT", displayName: "Staff" } as AuthUser;
  return render(
    <CabinetPresentationProvider value={cabinetPresentationFixture(user, proContext, true)}>
      <ScannerHub userId={USER_ID} />
    </CabinetPresentationProvider>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.stubGlobal("crypto", { randomUUID: () => "00000000-0000-4000-8000-000000000002" });
});

describe.each([
  ["direct ORG_EMPLOYEE without any branch", directEmployee],
  ["HEAD_OFFICE member without a branch assignment", headOffice],
])("AB-12: %s with saved activation right", (_label, make) => {
  it("search is enabled, preview and order go out WITHOUT a branch (NULL receiving contour), no first-branch substitution", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/preview")) return new Response(JSON.stringify(previewAllowed), { status: 200 });
      if (url.includes("/api/store/order") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ order: { id: "ord-1" }, summary: { totalAmount: 1000, discountAmount: 100, isSelfScan: false } }),
          { status: 201 },
        );
      }
      return new Response("{}", { status: 404 });
    });
    const user = userEvent.setup();
    renderWith(make());
    expect(screen.queryByText(/Недостаточно прав для оформления/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Нет филиалов, где разрешено/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/филиал операции/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/код или промокод/i), CERT);
    const find = screen.getByRole("button", { name: /найти/i });
    expect(find).toBeEnabled();
    await user.click(find);
    await confirmScannerPurchaseThroughReview(user, "1000");

    await waitFor(() => expect(calls.some((c) => c.init?.method === "POST" && c.url.includes("/order"))).toBe(true));
    for (const c of calls) expect(c.url).not.toContain("branchId=");
    const gateArgs = vi.mocked(resolveReceivingScannerCertificateEntryGate).mock.calls.at(-1)?.[0];
    expect(gateArgs?.branchId?.trim() || undefined).toBeUndefined();
  });
});

describe("AB-12: no new write rights", () => {
  it.each([
    ["ORG_EMPLOYEE VIEWER", directEmployee(rights("VIEWER", { canViewWallet: true }))],
    ["ORG_EMPLOYEE activation revoked", directEmployee(rights("MANAGER", { canActivateCertificates: false }))],
    ["ORG_EMPLOYEE never saved", { ...directEmployee(), rights: undefined } as ProContextSnapshot],
    ["HEAD_OFFICE activation revoked", headOffice(rights("MANAGER", { canActivateCertificates: false }))],
    ["HEAD_OFFICE never saved", { ...headOffice(), rights: undefined } as ProContextSnapshot],
  ])("%s: search stays blocked, nothing is requested", async (_n, ctx) => {
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 404 }));
    vi.stubGlobal("fetch", fetchSpy);
    renderWith(ctx);
    expect(
      screen.getAllByText(/Недостаточно прав для оформления|Нет филиалов, где разрешено/).length,
    ).toBeGreaterThan(0);
    const find = screen.queryByRole("button", { name: /найти/i });
    if (find) expect(find).toBeDisabled();
    expect(fetchSpy.mock.calls.some(([u]) => String(u).includes("/preview"))).toBe(false);
  });
});
