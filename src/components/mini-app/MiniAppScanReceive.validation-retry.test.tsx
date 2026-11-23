import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppScanReceive } from "./MiniAppScanReceive";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import { RemcardApiError, remcardFetchWithMeta } from "@/lib/api-client";

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));
vi.mock("@/components/scanner/useReceivingAppealScannerHandoff", () => ({
  useReceivingAppealScannerHandoff: () => ({
    ordinaryAppealRequired: false,
    crmReadOnlyNotice: null,
    appealId: null,
    linkPhase: "idle",
    linkError: "",
    ensureOrdinaryAppealContext: async () => ({ ok: true as const }),
    assertPreviewAllowed: () => null,
    beginOrderLinkAfterSuccess: () => undefined,
    retryOrderLinkOnly: () => undefined,
  }),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return { ...actual, remcardFetchWithMeta: vi.fn() };
});

const bootstrap: MiniAppBootstrap = {
  actorUserId: "user-retry-test",
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

const successPayload = {
  order: { id: "order-ok-2" },
  summary: { totalAmount: 10000, discountAmount: 700, isSelfScan: true },
};

describe("MiniAppScanReceive validation retry", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(remcardFetchWithMeta).mockReset();
    let id = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `idempotency-${++id}` });
  });

  it("after HTTP 400 releases attempt so second POST uses new idempotency key", async () => {
    const user = userEvent.setup();
    const keys: string[] = [];
    vi.mocked(remcardFetchWithMeta)
      .mockImplementation(async (path, init) => {
        if (init?.idempotencyKey) keys.push(init.idempotencyKey);
        if (keys.length === 1) {
          throw new RemcardApiError(400, "Скидка клиента 10% превышает максимум", {
            error: "Скидка клиента 10% превышает максимум по категории",
          });
        }
        return { payload: successPayload, meta: {} };
      });

    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        onDone={() => undefined}
        fixturePreview={preview}
      />,
    );

    await user.clear(screen.getByTestId("mini-discount-input-doors"));
    await user.type(screen.getByTestId("mini-discount-input-doors"), "10");
    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/превышает максимум/i)).toBeInTheDocument();

    await user.clear(screen.getByTestId("mini-discount-input-doors"));
    await user.type(screen.getByTestId("mini-discount-input-doors"), "7");
    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(2));
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
    await waitFor(() => expect(screen.getByTestId("mini-scan-success")).toBeInTheDocument());
  });

  it("blocks a fresh purchase after uncertain network without a second POST", async () => {
    const user = userEvent.setup();
    vi.mocked(remcardFetchWithMeta).mockRejectedValueOnce(new TypeError("network down"));

    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        onDone={() => undefined}
        fixturePreview={preview}
      />,
    );

    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() => expect(screen.getByTestId("mini-order-uncertain")).toBeInTheDocument());
    expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("mini-discount-input-doors")).toBeDisabled();
    expect(screen.getByTestId("mini-scan-confirm-step")).toBeDisabled();
    expect(screen.getByTestId("mini-scan-another")).toBeDisabled();
    expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1);
  });
});