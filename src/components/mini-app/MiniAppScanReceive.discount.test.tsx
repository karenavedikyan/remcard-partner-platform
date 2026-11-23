import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppScanReceive } from "./MiniAppScanReceive";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import { buildOrderItems } from "@/lib/order-totals";

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));
vi.mock("@/components/scanner/useReceivingAppealScannerHandoff", () => ({
  useReceivingAppealScannerHandoff: () => ({
    ordinaryAppealRequired: false,
    ordinaryAppealIntegrationRequired: false,
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
  }),
}));

const bootstrap: MiniAppBootstrap = {
  actorUserId: "user-discount-test",
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
  presentation: {
    cardIdentifier: null,
    historyHref: "/settlements",
    cardExplainer: "",
  },
  fullCabinetUrl: "https://prof.test/",
  partnersUrl: "https://prof.test/partners",
};

const multiCategoryPreview: OrderPreviewAllowed = {
  allowed: true,
  certificate: {
    id: "c1",
    promoCode: "RC-D",
    status: "ACTIVE",
    validUntil: null,
    usageCount: 0,
    maxUsages: 1,
    userAlias: "Клиент",
    issuer: { label: "PROF", name: "Org" },
  },
  partner: { id: "p1", storeUserId: "s1", storeName: "Store", isSelfScan: true },
  availableCategories: [
    { category: "doors", categoryLabel: "Двери", discountPercent: 7, issuerPercent: 3 },
    { category: "floor", categoryLabel: "Пол", discountPercent: 10, issuerPercent: 5 },
  ],
};

function renderPurchase(preview = multiCategoryPreview) {
  return render(
    <MiniAppScanReceive
      platform="telegram"
      bootstrap={bootstrap}
      branchId="b1"
      onDone={() => undefined}
      fixturePreview={preview}
    />,
  );
}

function discountInput(category: string) {
  return screen.getByTestId(`mini-discount-input-${category}`);
}

describe("MiniAppScanReceive discount drafts", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows certificate default after clear and blur, and omits discount in order payload when unset", async () => {
    const user = userEvent.setup();
    renderPurchase();
    const doors = discountInput("doors");
    expect(doors).toHaveValue(7);
    await user.clear(doors);
    await user.tab();
    await waitFor(() => expect(doors).toHaveValue(7));

    const items = buildOrderItems(
      multiCategoryPreview.availableCategories,
      { doors: "10000", floor: "10000" },
      {},
    );
    expect(items.find((i) => i.category === "doors")?.discountPercent).toBeUndefined();
  });

  it("keeps explicit 0% in payload and totals", async () => {
    const user = userEvent.setup();
    renderPurchase();
    const doors = discountInput("doors");
    await user.clear(doors);
    await user.type(doors, "0");
    await user.tab();
    expect(doors).toHaveValue(0);
    const items = buildOrderItems(
      multiCategoryPreview.availableCategories,
      { doors: "10000", floor: "10000" },
      { doors: "0" },
    );
    expect(items.find((i) => i.category === "doors")?.discountPercent).toBe(0);
  });

  it("blocks confirm and shows field error for negative discount before click", async () => {
    const user = userEvent.setup();
    renderPurchase();
    const doors = discountInput("doors");
    await user.clear(doors);
    await user.type(doors, "-1");
    expect(screen.getByTestId("mini-discount-error-doors")).toHaveTextContent(/отрицательн/i);
    expect(screen.getByTestId("mini-scan-confirm-step")).toBeDisabled();
    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    expect(screen.queryByText(/подтвердите оформление/i)).toBeNull();
  });

  it("allows exact pool maximum and blocks +0.01pp per category limits", async () => {
    const user = userEvent.setup();
    renderPurchase();
    const doors = discountInput("doors");
    await user.clear(doors);
    await user.type(doors, "10");
    await user.tab();
    expect(screen.queryByTestId("mini-discount-error-doors")).toBeNull();
    expect(screen.getByTestId("mini-scan-confirm-step")).not.toBeDisabled();

    await user.clear(doors);
    await user.type(doors, "10.01");
    expect(screen.getByTestId("mini-discount-error-doors")).toHaveTextContent(/максимум 10%/);
    expect(screen.getByTestId("mini-scan-confirm-step")).toBeDisabled();

    const floor = discountInput("floor");
    await user.clear(floor);
    await user.type(floor, "15.01");
    expect(screen.getByTestId("mini-discount-error-floor")).toHaveTextContent(/максимум 15%/);
  });
});