import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiniAppScanReceive } from "./MiniAppScanReceive";
import type { MiniAppBootstrap } from "@/lib/mini-app/types";
import type { OrderPreviewAllowed } from "@/lib/order-types";
import { remcardFetch, remcardFetchWithMeta } from "@/lib/api-client";
import {
  STORE_ORDER_ATTEMPT_FORMAT_VERSION,
  STORE_ORDER_ATTEMPT_STORAGE_KEY,
} from "@/lib/store-order-attempt";
import {
  fetchReceivingAppealDetailWire,
  postReceivingAppealOrderLink,
  submitReceivingCertificateEntry,
} from "@/lib/clients-parity/receiving-appeals-api";
import { loadScannerOrdinaryAppealBinding } from "@/lib/scanner/receiving-appeal-handoff";

vi.mock("./QrScanner", () => ({ QrScanner: () => null }));

vi.mock("@/lib/remcard-proxy", () => ({
  isAllowedProxyRoute: () => true,
}));

vi.mock("@/lib/clients-parity/receiving-appeals-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/clients-parity/receiving-appeals-api")>();
  return {
    ...actual,
    fetchReceivingAppealDetailWire: vi.fn(),
    postReceivingAppealOrderLink: vi.fn(),
    submitReceivingCertificateEntry: vi.fn(),
    resolveReceivingScannerCertificateEntryGate: vi.fn(),
  };
});

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: vi.fn(),
    remcardFetchWithMeta: vi.fn(),
  };
});

const APPEAL_ID = "qa-appeal";
const USER_ID = "user-url-remount";

const bootstrap: MiniAppBootstrap = {
  actorUserId: USER_ID,
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
    id: "cert-bound-1",
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
};

const qaOrderPayload = {
  order: { id: "qa-order" },
  summary: { totalAmount: 10000, discountAmount: 0, isSelfScan: true },
};

function appealWire(revision = 41) {
  return {
    ok: true as const,
    wire: {
      readOnly: false,
      revision,
      access: { mutationsAllowed: true, listAllowed: true },
      appeal: {
        id: APPEAL_ID,
        certificateId: "cert-bound-1",
        stageKey: "sys_new",
        certificatePromoCode: "RC-REMOUNT",
      },
    },
  };
}

describe("MiniAppScanReceive URL appeal remount with real handoff", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.mocked(fetchReceivingAppealDetailWire).mockResolvedValue(appealWire());
    vi.mocked(postReceivingAppealOrderLink).mockResolvedValue({
      ok: true,
      data: { orderId: "qa-order", revision: 42 },
    });
    vi.mocked(submitReceivingCertificateEntry).mockReset();
    vi.mocked(remcardFetch).mockResolvedValue(preview);
    let id = 0;
    vi.stubGlobal("crypto", { randomUUID: () => `idem-remount-${++id}` });
    vi.mocked(remcardFetchWithMeta)
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValue({ payload: qaOrderPayload, meta: { idempotentReplayed: true } });
  });

  it("Chromium repro: persisted binding + remount check fires CRM order-link with frozen revision 41", async () => {
    const user = userEvent.setup();
    const first = render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        appealId={APPEAL_ID}
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-REMOUNT"
      />,
    );

    await waitFor(() => expect(fetchReceivingAppealDetailWire).toHaveBeenCalledWith(APPEAL_ID));
    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));

    await waitFor(() => expect(screen.getByTestId("mini-order-uncertain")).toBeInTheDocument());
    expect(submitReceivingCertificateEntry).not.toHaveBeenCalled();
    expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1);
    const attemptKey = JSON.parse(sessionStorage.getItem(STORE_ORDER_ATTEMPT_STORAGE_KEY)!).idempotencyKey;
    const binding = loadScannerOrdinaryAppealBinding(USER_ID, attemptKey, "RC-REMOUNT", "b1");
    expect(binding).toMatchObject({ appealId: APPEAL_ID, revision: 41 });

    first.unmount();
    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        appealId={APPEAL_ID}
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-REMOUNT"
      />,
    );

    await waitFor(() => expect(fetchReceivingAppealDetailWire).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("mini-order-uncertain")).toBeInTheDocument());
    await user.click(screen.getByTestId("mini-check-order-result"));

    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(postReceivingAppealOrderLink).toHaveBeenCalledWith(
        APPEAL_ID,
        expect.objectContaining({ orderId: "qa-order", expectedRevision: 41 }),
      ),
    );
    expect(submitReceivingCertificateEntry).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/привязан к обращению/i)).toBeInTheDocument());
  });

  it("initial CRM order-link HTTP 503: link-only retry never POSTs order again", async () => {
    vi.mocked(postReceivingAppealOrderLink)
      .mockResolvedValueOnce({ ok: false, code: "ERROR", message: "Service Unavailable" })
      .mockResolvedValueOnce({
        ok: true,
        data: { orderId: "qa-order", revision: 42 },
      });

    vi.mocked(remcardFetchWithMeta).mockReset();
    vi.mocked(remcardFetchWithMeta).mockResolvedValue({
      payload: qaOrderPayload,
      meta: { idempotentReplayed: true },
    });

    const user = userEvent.setup();
    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        appealId={APPEAL_ID}
        onDone={() => undefined}
        fixturePreview={preview}
        fixtureCertCode="RC-REMOUNT"
      />,
    );

    await waitFor(() => expect(fetchReceivingAppealDetailWire).toHaveBeenCalled());
    await user.click(screen.getByTestId("mini-scan-confirm-step"));
    await user.click(screen.getByRole("button", { name: /подтвердить покупку/i }));
    await waitFor(() => expect(screen.getByTestId("mini-scan-success")).toBeInTheDocument());
    await waitFor(() => expect(postReceivingAppealOrderLink).toHaveBeenCalledTimes(1));

    expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /повторить только привязку/i }));
    await waitFor(() => expect(postReceivingAppealOrderLink).toHaveBeenCalledTimes(2));
    expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/привязан к обращению/i)).toBeInTheDocument());
  });

  it("rejects changed URL appealId and never calls order-link", async () => {
    vi.mocked(remcardFetchWithMeta).mockReset();
    vi.mocked(remcardFetchWithMeta).mockResolvedValue({
      payload: qaOrderPayload,
      meta: { idempotentReplayed: true },
    });

    sessionStorage.setItem(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: STORE_ORDER_ATTEMPT_FORMAT_VERSION,
        userId: USER_ID,
        idempotencyKey: "idem-scope",
        status: "unknown",
        branchId: "b1",
        body: {
          certificateCode: "RC-REMOUNT",
          items: [{ category: "doors", categoryLabel: "Двери", amount: 10000 }],
        },
      }),
    );
    const binding = {
      v: 1 as const,
      userId: USER_ID,
      idempotencyKey: "idem-scope",
      appealId: APPEAL_ID,
      certCode: "RC-REMOUNT",
      branchId: "b1",
      revision: 41,
    };
    const key = "remcard.scannerOrdinaryAppealBindings.v1";
    sessionStorage.setItem(key, JSON.stringify({ [`${USER_ID}\u0000idem-scope\u0000RC-REMOUNT\u0000b1`]: binding }));

    const user = userEvent.setup();
    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b1"
        appealId="other-appeal"
        onDone={() => undefined}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("mini-scan-recovery")).toBeInTheDocument());
    await user.click(screen.getByTestId("mini-check-order-result"));
    await waitFor(() => expect(remcardFetchWithMeta).toHaveBeenCalledTimes(1));
    expect(postReceivingAppealOrderLink).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/нет доверенного контекста/i)).toBeInTheDocument());
  });

  it("replays uncertain attempt with captured branch only", async () => {
    sessionStorage.setItem(
      STORE_ORDER_ATTEMPT_STORAGE_KEY,
      JSON.stringify({
        version: STORE_ORDER_ATTEMPT_FORMAT_VERSION,
        userId: USER_ID,
        idempotencyKey: "idem-captured-branch",
        status: "unknown",
        branchId: "b-captured",
        body: {
          certificateCode: "RC-REMOUNT",
          items: [{ category: "doors", categoryLabel: "Двери", amount: 10000 }],
        },
      }),
    );

    vi.mocked(remcardFetchWithMeta).mockReset();
    vi.mocked(remcardFetchWithMeta).mockResolvedValue({
      payload: qaOrderPayload,
      meta: { idempotentReplayed: true },
    });

    render(
      <MiniAppScanReceive
        platform="telegram"
        bootstrap={bootstrap}
        branchId="b-other"
        appealId={APPEAL_ID}
        onDone={() => undefined}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("mini-scan-recovery")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId("mini-branch-mismatch")).toBeInTheDocument());
    expect(remcardFetchWithMeta).not.toHaveBeenCalled();
    expect(screen.queryByTestId("mini-check-order-result")).toBeNull();
  });
});