import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppScanReceive } from "./MiniAppScanReceive";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import {
  STORE_ORDER_ATTEMPT_STORAGE_KEY,
  STORE_ORDER_ATTEMPT_FORMAT_VERSION,
} from "@/lib/store-order-attempt";
import { remcardFetch, remcardFetchWithMeta } from "@/lib/api-client";

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));

const ensureOrdinaryAppealContext = vi.fn();
const restoreOrdinaryAppealForStoredAttempt = vi.fn();
const submitReceivingCertificateEntry = vi.fn();

vi.mock("@/lib/mini-app/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mini-app/api")>();
  return {
    ...actual,
    miniAppStoreScanLookup: vi.fn().mockResolvedValue({ state: "valid" }),
  };
});

vi.mock("@/components/scanner/useReceivingAppealScannerHandoff", () => ({
  useReceivingAppealScannerHandoff: () => ({
    ordinaryAppealRequired: true,
    ordinaryAppealIntegrationRequired: true,
    appealSubmitBindingRequired: false,
    appealScoped: false,
    requiresAppealReady: false,
    context: { status: "idle" },
    crmReadOnlyNotice: null,
    appealId: null,
    linkPhase: "idle",
    linkError: "",
    ensureOrdinaryAppealContext,
    restoreOrdinaryAppealForStoredAttempt,
    assertPreviewAllowed: () => null,
    beginOrderLinkAfterSuccess: () => undefined,
    retryOrderLinkOnly: () => undefined,
    persistOrdinaryAppealBinding: () => true,
    prepareOrderAttemptScope: () => undefined,
    isSubmitLinkScopeReady: () => true,
  }),
}));

vi.mock("@/lib/clients-parity/receiving-appeals-api", () => ({
  submitReceivingCertificateEntry,
  resolveReceivingScannerCertificateEntryGate: vi.fn(),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
    remcardFetchWithMeta: vi.fn(),
  };
});

const bootstrap: MiniAppBootstrap = {
  actorUserId: "user-recovery-remount",
  role: "store",
  roleLabel: "Магазин",
  platform: "telegram",
  displayName: "Тест",
  entityLine: null,
  cabinetTitle: "Кабинет",
  workplaceLabel: null,
  actions: [],
  branches: [],
  activeBranchId: "b-other",
  workplaceForbidden: false,
  workplaceForbiddenMessage: null,
  wallet: { status: "ok", confirmedUnpaidRub: 0, awaitingRub: 0, loadError: false },
  presentation: { cardIdentifier: null, historyHref: "/settlements", cardExplainer: "" },
  fullCabinetUrl: "https://prof.test/",
  partnersUrl: "https://prof.test/partners",
};

const storedAttempt = {
  version: STORE_ORDER_ATTEMPT_FORMAT_VERSION,
  userId: bootstrap.actorUserId,
  idempotencyKey: "idem-branch-original",
  status: "unknown" as const,
  branchId: "b-original",
  body: {
    certificateCode: "RC-REMOUNT",
    items: [{ category: "doors", categoryLabel: "Двери", amount: 10000, discountPercent: 7 }],
  },
};

describe("MiniAppScanReceive recovery remount", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    ensureOrdinaryAppealContext.mockReset();
    restoreOrdinaryAppealForStoredAttempt.mockResolvedValue({ ok: true });
    submitReceivingCertificateEntry.mockReset();
    vi.mocked(remcardFetch).mockResolvedValue({
      allowed: true,
      certificate: {
        id: "c1",
        promoCode: "RC-REMOUNT",
        status: "ACTIVE",
        validUntil: null,
        usageCount: 0,
        maxUsages: 1,
        userAlias: "Клиент",
        issuer: { label: "PROF", name: "Org" },
      },
      partner: { id: "p1", storeUserId: "s1", storeName: "Store", isSelfScan: true },
      availableCategories: [{ category: "doors", categoryLabel: "Двери", discountPercent: 7, issuerPercent: 3 }],
    });
    vi.mocked(remcardFetchWithMeta).mockResolvedValue({
      payload: { order: { id: "ord-1" }, summary: { totalAmount: 10000, discountAmount: 700, isSelfScan: true } },
      meta: { idempotentReplayed: false },
    });
    sessionStorage.setItem(STORE_ORDER_ATTEMPT_STORAGE_KEY, JSON.stringify(storedAttempt));
  });

  it("opens recovery UI without CRM create on remount", async () => {
    render(
      <MiniAppScanReceive platform="telegram" bootstrap={bootstrap} branchId="b-other" onDone={() => undefined} />,
    );

    expect(await screen.findByTestId("mini-scan-recovery")).toBeInTheDocument();
    expect(ensureOrdinaryAppealContext).not.toHaveBeenCalled();
    expect(submitReceivingCertificateEntry).not.toHaveBeenCalled();
    expect(restoreOrdinaryAppealForStoredAttempt).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mini-branch-mismatch")).toBeInTheDocument();
    expect(screen.queryByTestId("mini-check-order-result")).not.toBeInTheDocument();
  });

  it("retry POST uses stored branch and idempotency key when branch matches", async () => {
    const user = userEvent.setup();
    const keys: string[] = [];
    const branches: string[] = [];
    vi.mocked(remcardFetchWithMeta).mockImplementation(async (_path, init) => {
      if (init?.idempotencyKey) keys.push(init.idempotencyKey);
      const sp = init?.searchParams as { branchId?: string } | undefined;
      if (sp?.branchId) branches.push(sp.branchId);
      return {
        payload: { order: { id: "ord-1" }, summary: { totalAmount: 10000, discountAmount: 700, isSelfScan: true } },
        meta: { idempotentReplayed: false },
      };
    });

    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b-original"
        onDone={() => undefined}
      />,
    );

    await screen.findByTestId("mini-scan-recovery");
    await user.click(screen.getByTestId("mini-check-order-result"));

    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1));
    expect(keys).toEqual(["idem-branch-original"]);
    expect(branches).toEqual(["b-original"]);
    expect(createFreshKeyGuard(keys)).toBe(true);
  });
});

function createFreshKeyGuard(keys: string[]) {
  return keys.length === 1 && keys[0] === "idem-branch-original";
}