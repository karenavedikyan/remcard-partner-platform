import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppScanReceive } from "./MiniAppScanReceive";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import {
  STORE_ORDER_ATTEMPT_STORAGE_KEY,
  STORE_ORDER_ATTEMPT_FORMAT_VERSION,
} from "@/lib/store-order-attempt";
import { remcardFetchWithMeta } from "@/lib/api-client";

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));
vi.mock("@/lib/mini-app/api", () => ({
  miniAppStoreScanLookup: vi.fn().mockResolvedValue({ state: "valid" }),
}));
vi.mock("@/components/scanner/useReceivingAppealScannerHandoff", () => ({
  useReceivingAppealScannerHandoff: () => ({
    ordinaryAppealRequired: false,
    ordinaryAppealIntegrationRequired: false,
    appealSubmitBindingRequired: false,
    appealScoped: false,
    requiresAppealReady: false,
    context: { status: "idle" },
    crmReadOnlyNotice: null,
    appealId: null,
    linkPhase: "idle",
    linkError: "",
    ensureOrdinaryAppealContext: async () => ({ ok: true as const }),
    restoreOrdinaryAppealForStoredAttempt: async () => ({ ok: true as const }),
    assertPreviewAllowed: () => null,
    beginOrderLinkAfterSuccess: () => undefined,
    retryOrderLinkOnly: () => undefined,
    persistOrdinaryAppealBinding: () => true,
    prepareOrderAttemptScope: () => undefined,
    isSubmitLinkScopeReady: () => true,
  }),
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
  actorUserId: "user-rescan-guard",
  role: "store",
  roleLabel: "Магазин",
  platform: "telegram",
  displayName: "Тест",
  entityLine: null,
  cabinetTitle: "Кабинет",
  workplaceLabel: null,
  actions: [],
  branches: [],
  activeBranchId: "b1",
  workplaceForbidden: false,
  workplaceForbiddenMessage: null,
  wallet: { status: "ok", confirmedUnpaidRub: 0, awaitingRub: 0, loadError: false },
  presentation: { cardIdentifier: null, historyHref: "/settlements", cardExplainer: "" },
  fullCabinetUrl: "https://prof.test/",
  partnersUrl: "https://prof.test/partners",
};

const preview: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "c1",
    promoCode: "RC-R",
    status: "ACTIVE",
    validUntil: null,
    usageCount: 0,
    maxUsages: 1,
    userAlias: "Клиент",
    issuer: { label: "PROF", name: "Org" },
  },
  partner: { id: "p1", storeUserId: "s1", storeName: "Store", isSelfScan: true },
  availableCategories: [{ category: "doors", categoryLabel: "Двери", discountPercent: 7, issuerPercent: 3 }],
};

describe("MiniAppScanReceive rescan guard", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(remcardFetchWithMeta).mockReset();
    vi.stubGlobal("crypto", { randomUUID: () => "idem-rescan-1" });
  });

  it("disables rescan while submit is pending", async () => {
    const user = userEvent.setup();
    let resolvePost!: (value: unknown) => void;
    vi.mocked(remcardFetchWithMeta).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );

    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-FIXTURE"
      />,
    );

    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /оформление/i })).toBeDisabled(),
    );
    expect(screen.getByTestId("mini-scan-another")).toBeDisabled();

    resolvePost({ payload: { order: { id: "o1" }, summary: { totalAmount: 1, discountAmount: 0, isSelfScan: true } }, meta: {} });
    await waitFor(() => expect(screen.getByTestId("mini-scan-success")).toBeInTheDocument());
  });

  it("after uncertain keeps session attempt and blocks rescan", async () => {
    const user = userEvent.setup();
    vi.mocked(remcardFetchWithMeta).mockRejectedValueOnce(new TypeError("network"));

    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-FIXTURE"
      />,
    );

    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() => expect(screen.getByTestId("mini-order-uncertain")).toBeInTheDocument());
    expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("mini-scan-another")).toBeDisabled();
    const raw = sessionStorage.getItem(STORE_ORDER_ATTEMPT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).status).toBe("unknown");
  });

  it("remount with unknown attempt restores uncertain without second POST on confirm block", async () => {
    sessionStorage.setItem(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: STORE_ORDER_ATTEMPT_FORMAT_VERSION,
        userId: bootstrap.actorUserId,
        idempotencyKey: "idem-remount",
        status: "unknown",
        branchId: "b1",
        body: {
          certificateCode: "RC-FIXTURE",
          items: [{ category: "doors", categoryLabel: "Двери", amount: 10000 }],
        },
      }),
    );

    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-FIXTURE"
      />,
    );

    expect(screen.getByTestId("mini-order-uncertain")).toBeInTheDocument();
    expect(screen.getByTestId("mini-scan-confirm-step")).toBeDisabled();
    expect(remcardFetchWithMeta).not.toHaveBeenCalled();
  });

  it("check result reuses same idempotency key", async () => {
    sessionStorage.setItem(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: STORE_ORDER_ATTEMPT_FORMAT_VERSION,
        userId: bootstrap.actorUserId,
        idempotencyKey: "idem-check",
        status: "unknown",
        branchId: "b1",
        body: {
          certificateCode: "RC-FIXTURE",
          items: [{ category: "doors", categoryLabel: "Двери", amount: 10000 }],
        },
      }),
    );

    const user = userEvent.setup();
    const keys: string[] = [];
    vi.mocked(remcardFetchWithMeta).mockImplementation(async (_path, init) => {
      if (init?.idempotencyKey) keys.push(init.idempotencyKey);
      return {
        payload: { order: { id: "o1" }, summary: { totalAmount: 10000, discountAmount: 0, isSelfScan: true } },
        meta: {},
      };
    });

    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-FIXTURE"
      />,
    );

    await user.click(screen.getByTestId("mini-check-order-result"));
    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1));
    expect(keys).toEqual(["idem-check"]);
  });
});