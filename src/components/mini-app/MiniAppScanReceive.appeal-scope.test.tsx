import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppScanReceive } from "./MiniAppScanReceive";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import { remcardFetchWithMeta } from "@/lib/api-client";
import {
  STORAGE_SAVE_FAILED_MESSAGE,
  STORE_ORDER_ATTEMPT_STORAGE_KEY,
  loadStoreOrderAttempt,
} from "@/lib/store-order-attempt";

const handoffState = vi.hoisted(() => ({
  ordinaryAppealIntegrationRequired: true,
    appealSubmitBindingRequired: true,
  appealScoped: true,
  appealId: "appeal-url-1" as string | null,
  crmReadOnlyNotice: null as string | null,
  prepareOrderAttemptScope: vi.fn(),
  persistOrdinaryAppealBinding: vi.fn(() => true),
  beginOrderLinkAfterSuccess: vi.fn(),
  isSubmitLinkScopeReady: vi.fn(() => true),
}));

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));
vi.mock("@/components/scanner/useReceivingAppealScannerHandoff", () => ({
  useReceivingAppealScannerHandoff: () => ({
    ordinaryAppealRequired: true,
    ordinaryAppealIntegrationRequired: handoffState.ordinaryAppealIntegrationRequired,
    appealSubmitBindingRequired: handoffState.appealSubmitBindingRequired,
    appealScoped: handoffState.appealScoped,
    requiresAppealReady: false,
    context: { status: "ready", appealId: handoffState.appealId ?? "appeal-url-1" },
    crmReadOnlyNotice: handoffState.crmReadOnlyNotice,
    appealId: handoffState.appealId,
    linkPhase: "idle",
    linkError: "",
    ensureOrdinaryAppealContext: async () => ({ ok: true as const }),
    restoreOrdinaryAppealForStoredAttempt: async () => ({ ok: true as const }),
    assertPreviewAllowed: () => null,
    beginOrderLinkAfterSuccess: handoffState.beginOrderLinkAfterSuccess,
    retryOrderLinkOnly: () => undefined,
    persistOrdinaryAppealBinding: handoffState.persistOrdinaryAppealBinding,
    prepareOrderAttemptScope: handoffState.prepareOrderAttemptScope,
    isSubmitLinkScopeReady: handoffState.isSubmitLinkScopeReady,
  }),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, remcardFetchWithMeta: vi.fn() };
});

const bootstrap: MiniAppBootstrap = {
  actorUserId: "user-appeal-scope",
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
    promoCode: "RC-A",
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

const successPayload = {
  order: { id: "order-appeal-1" },
  summary: { totalAmount: 10000, discountAmount: 0, isSelfScan: true },
};

describe("MiniAppScanReceive appeal scope", () => {
  beforeEach(() => {
    sessionStorage.clear();
    handoffState.ordinaryAppealIntegrationRequired = true;
    handoffState.appealSubmitBindingRequired = true;
    handoffState.appealScoped = true;
    handoffState.appealId = "appeal-url-1";
    handoffState.crmReadOnlyNotice = null;
    handoffState.prepareOrderAttemptScope.mockReset();
    handoffState.persistOrdinaryAppealBinding.mockReset();
    handoffState.persistOrdinaryAppealBinding.mockReturnValue(true);
    handoffState.beginOrderLinkAfterSuccess.mockReset();
    vi.mocked(remcardFetchWithMeta).mockReset();
    let id = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `idempotency-${++id}` });
    vi.mocked(remcardFetchWithMeta).mockResolvedValue({ payload: successPayload, meta: {} });
  });

  it("URL-scoped fresh submit freezes scope before POST and links after success", async () => {
    const user = userEvent.setup();
    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        appealId="appeal-url-1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-A"
      />,
    );

    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1));
    expect(handoffState.persistOrdinaryAppealBinding).toHaveBeenCalledWith(
      "user-appeal-scope",
      expect.any(String),
      expect.objectContaining({ certCode: "RC-A", branchId: "b1" }),
    );
    expect(handoffState.prepareOrderAttemptScope).toHaveBeenCalledWith(
      expect.any(String),
      false,
      expect.objectContaining({
        userId: "user-appeal-scope",
        certCode: "RC-A",
        branchId: "b1",
      }),
    );
    expect(handoffState.beginOrderLinkAfterSuccess).toHaveBeenCalledWith("order-appeal-1", expect.any(String));
    await waitFor(() => expect(screen.getByTestId("mini-scan-success")).toBeInTheDocument());
  });

  it("blocks fresh submit before POST when ordinary binding persistence fails", async () => {
    handoffState.persistOrdinaryAppealBinding.mockReturnValue(false);
    const user = userEvent.setup();
    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        appealId="appeal-url-1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-A"
      />,
    );

    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() => expect(screen.getByText(STORAGE_SAVE_FAILED_MESSAGE)).toBeInTheDocument());
    expect(remcardFetchWithMeta).not.toHaveBeenCalled();
    expect(handoffState.prepareOrderAttemptScope).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(STORE_ORDER_ATTEMPT_STORAGE_KEY)).toBeNull();
  });

  it("after binding failure a second confirm still requires persist and clears stale in-flight", async () => {
    handoffState.persistOrdinaryAppealBinding.mockReturnValueOnce(false).mockReturnValueOnce(true);
    const user = userEvent.setup();
    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        appealId="appeal-url-1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-A"
      />,
    );

    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));
    await waitFor(() => expect(screen.getByText(STORAGE_SAVE_FAILED_MESSAGE)).toBeInTheDocument());
    expect(remcardFetchWithMeta).not.toHaveBeenCalled();
    expect(loadStoreOrderAttempt(bootstrap.actorUserId)).toBeNull();

    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));
    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1));
    expect(handoffState.persistOrdinaryAppealBinding).toHaveBeenCalledTimes(2);
  });

  it("serializes concurrent confirm clicks to one order POST", async () => {
    let release!: () => void;
    const hold = new Promise<{ payload: typeof successPayload; meta: Record<string, never> }>((resolve) => {
      release = () => resolve({ payload: successPayload, meta: {} });
    });
    vi.mocked(remcardFetchWithMeta).mockImplementation(() => hold);
    const user = userEvent.setup();
    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        appealId="appeal-url-1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-A"
      />,
    );

    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    const confirmBtn = screen.getByRole("button", { name: /подтвердить покупку/i });
    await user.click(confirmBtn);
    await user.click(confirmBtn);
    expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(screen.getByTestId("mini-scan-success")).toBeInTheDocument());
  });

  it("still POSTs when CRM integration is read-only", async () => {
    handoffState.ordinaryAppealIntegrationRequired = false;
    handoffState.appealSubmitBindingRequired = false;
    handoffState.appealScoped = false;
    handoffState.appealId = null;
    handoffState.crmReadOnlyNotice = "CRM только для чтения";
    handoffState.persistOrdinaryAppealBinding.mockReturnValue(false);
    const user = userEvent.setup();
    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-A"
      />,
    );

    expect(screen.getByText(/CRM только для чтения/i)).toBeInTheDocument();
    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1));
    expect(handoffState.persistOrdinaryAppealBinding).not.toHaveBeenCalled();
    expect(handoffState.prepareOrderAttemptScope).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("mini-scan-success")).toBeInTheDocument());
  });
});