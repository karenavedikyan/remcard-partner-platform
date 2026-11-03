import { describe, expect, it } from "vitest";
import type { BusinessHomeMetricSlice } from "@/lib/business-home/metrics-types";
import {
  initialCompanyLifetimeProbe,
  initialStoreLifetimeProbe,
} from "./activity-probes";
import {
  businessOwnerHomePendingSupplementalProbe,
  shouldShowBusinessOwnerHomeEmpty,
  shouldShowSpecialistHomeEmpty,
  specialistHomeMetricsEligibleForEmptyCheck,
  specialistHomePendingSupplementalProbe,
} from "./gate";
import { EMPTY_MASTER_WALLET_FIXTURE } from "./wallet-empty-proof";

const emptySlice = { state: "empty" } satisfies BusinessHomeMetricSlice;
const ok = (value: number) => ({ state: "ok" as const, value });

const zeroMetrics = {
  certificates: { state: "ok" as const, value: 0 },
  accrued: { state: "ok" as const, rub: 0 },
  received: { state: "ok" as const, rub: 0 },
};

describe("shouldShowBusinessOwnerHomeEmpty — STORE lifetime", () => {
  const todayEmptySlices: [
    BusinessHomeMetricSlice,
    BusinessHomeMetricSlice,
    BusinessHomeMetricSlice,
  ] = [emptySlice, emptySlice, emptySlice];

  const cleanStoreProbe = {
    state: "ok" as const,
    ordersOk: true,
    hasLifetimeOrders: false,
    partnershipsOk: true,
    partnershipCount: 0,
  };

  it("shows empty only when lifetime orders and full partnership list are zero", () => {
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "STORE",
        branchSelectionRequired: false,
        slices: todayEmptySlices,
        storeProbe: {
          state: "ok",
          ordersOk: true,
          hasLifetimeOrders: false,
          partnershipsOk: true,
          partnershipCount: 0,
        },
        companyProbe: initialCompanyLifetimeProbe(),
      }),
    ).toBe(true);
  });

  it("rejects empty when any store slice has an explicit nonzero value", () => {
    for (const slices of [
      [ok(5), emptySlice, emptySlice],
      [emptySlice, ok(5), emptySlice],
      [emptySlice, emptySlice, ok(5)],
    ] as const) {
      expect(
        shouldShowBusinessOwnerHomeEmpty({
          loadState: "loaded",
          partnerType: "STORE",
          branchSelectionRequired: false,
          slices,
          storeProbe: cleanStoreProbe,
          companyProbe: initialCompanyLifetimeProbe(),
        }),
      ).toBe(false);
    }
  });

  it("keeps dashboard when today metrics are empty but lifetime orders exist", () => {
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "STORE",
        branchSelectionRequired: false,
        slices: todayEmptySlices,
        storeProbe: {
          state: "ok",
          ordersOk: true,
          hasLifetimeOrders: true,
          partnershipsOk: true,
          partnershipCount: 0,
        },
        companyProbe: initialCompanyLifetimeProbe(),
      }),
    ).toBe(false);
  });

  it("keeps dashboard when inactive partnership still exists in full list", () => {
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "STORE",
        branchSelectionRequired: false,
        slices: todayEmptySlices,
        storeProbe: {
          state: "ok",
          ordersOk: true,
          hasLifetimeOrders: false,
          partnershipsOk: true,
          partnershipCount: 1,
        },
        companyProbe: initialCompanyLifetimeProbe(),
      }),
    ).toBe(false);
  });

  it("never shows empty while supplemental probes are loading or failed", () => {
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "STORE",
        branchSelectionRequired: false,
        slices: todayEmptySlices,
        storeProbe: { ...initialStoreLifetimeProbe(), state: "loading" },
        companyProbe: initialCompanyLifetimeProbe(),
      }),
    ).toBe(false);
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "STORE",
        branchSelectionRequired: true,
        slices: [
          { state: "needs_branch", message: "Выберите филиал" },
          emptySlice,
          emptySlice,
        ],
        storeProbe: initialStoreLifetimeProbe(),
        companyProbe: initialCompanyLifetimeProbe(),
      }),
    ).toBe(false);
  });

  it("pending supplemental probe for store zero candidate while probes idle or loading", () => {
    const todayEmptySlices: [
      BusinessHomeMetricSlice,
      BusinessHomeMetricSlice,
      BusinessHomeMetricSlice,
    ] = [emptySlice, emptySlice, emptySlice];
    expect(
      businessOwnerHomePendingSupplementalProbe({
        loadState: "loaded",
        partnerType: "STORE",
        branchSelectionRequired: false,
        slices: todayEmptySlices,
        storeProbe: { ...initialStoreLifetimeProbe(), state: "loading" },
        companyProbe: initialCompanyLifetimeProbe(),
      }),
    ).toBe(true);
    expect(
      businessOwnerHomePendingSupplementalProbe({
        loadState: "loaded",
        partnerType: "STORE",
        branchSelectionRequired: false,
        slices: todayEmptySlices,
        storeProbe: { ...initialStoreLifetimeProbe(), state: "error" },
        companyProbe: initialCompanyLifetimeProbe(),
      }),
    ).toBe(false);
  });
});

describe("shouldShowBusinessOwnerHomeEmpty — COMPANY", () => {
  const cleanCompanyProbe = {
    state: "ok" as const,
    partnershipsOk: true,
    partnershipCount: 0,
  };

  it("requires empty employees, branch rule, and zero full partnership list", () => {
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "COMPANY",
        branchSelectionRequired: false,
        slices: [ok(1), emptySlice, emptySlice],
        storeProbe: initialStoreLifetimeProbe(),
        companyProbe: {
          state: "ok",
          partnershipsOk: true,
          partnershipCount: 0,
        },
      }),
    ).toBe(true);
  });

  it("still allows empty for all-empty tertiary or single-branch company", () => {
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "COMPANY",
        branchSelectionRequired: false,
        slices: [emptySlice, emptySlice, emptySlice],
        storeProbe: initialStoreLifetimeProbe(),
        companyProbe: cleanCompanyProbe,
      }),
    ).toBe(true);
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "COMPANY",
        branchSelectionRequired: false,
        slices: [ok(1), emptySlice, emptySlice],
        storeProbe: initialStoreLifetimeProbe(),
        companyProbe: cleanCompanyProbe,
      }),
    ).toBe(true);
  });

  it("rejects empty when partners metric or employees metric is nonzero", () => {
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "COMPANY",
        branchSelectionRequired: false,
        slices: [emptySlice, emptySlice, ok(5)],
        storeProbe: initialStoreLifetimeProbe(),
        companyProbe: cleanCompanyProbe,
      }),
    ).toBe(false);
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "COMPANY",
        branchSelectionRequired: false,
        slices: [ok(1), emptySlice, ok(5)],
        storeProbe: initialStoreLifetimeProbe(),
        companyProbe: cleanCompanyProbe,
      }),
    ).toBe(false);
    expect(
      shouldShowBusinessOwnerHomeEmpty({
        loadState: "loaded",
        partnerType: "COMPANY",
        branchSelectionRequired: false,
        slices: [emptySlice, ok(5), emptySlice],
        storeProbe: initialStoreLifetimeProbe(),
        companyProbe: cleanCompanyProbe,
      }),
    ).toBe(false);
  });
});

describe("specialist home empty gate", () => {
  it("requires wallet proof empty and zero partnership list", () => {
    expect(
      specialistHomeMetricsEligibleForEmptyCheck(zeroMetrics, "loaded", "empty"),
    ).toBe(true);
    expect(
      shouldShowSpecialistHomeEmpty({
        metrics: zeroMetrics,
        loadState: "loaded",
        walletProof: "empty",
        partnershipProbeState: "ok",
        partnershipCount: 0,
      }),
    ).toBe(true);
  });

  it("rejects pending wallet accruals even when total and paid are zero", () => {
    expect(
      specialistHomeMetricsEligibleForEmptyCheck(zeroMetrics, "loaded", "not_empty"),
    ).toBe(false);
    expect(
      shouldShowSpecialistHomeEmpty({
        metrics: zeroMetrics,
        loadState: "loaded",
        walletProof: "not_empty",
        partnershipProbeState: "ok",
        partnershipCount: 0,
      }),
    ).toBe(false);
  });

  it("does not show empty while partnership probe is loading", () => {
    expect(
      shouldShowSpecialistHomeEmpty({
        metrics: zeroMetrics,
        loadState: "loaded",
        walletProof: "empty",
        partnershipProbeState: "loading",
        partnershipCount: null,
      }),
    ).toBe(false);
  });

  it("pending supplemental probe while idle or loading for zero candidate", () => {
    expect(
      specialistHomePendingSupplementalProbe({
        metrics: zeroMetrics,
        loadState: "loaded",
        walletProof: "empty",
        partnershipProbeState: "idle",
      }),
    ).toBe(true);
    expect(
      specialistHomePendingSupplementalProbe({
        metrics: zeroMetrics,
        loadState: "loaded",
        walletProof: "empty",
        partnershipProbeState: "loading",
      }),
    ).toBe(true);
    expect(
      specialistHomePendingSupplementalProbe({
        metrics: zeroMetrics,
        loadState: "loaded",
        walletProof: "empty",
        partnershipProbeState: "ok",
      }),
    ).toBe(false);
    expect(
      specialistHomePendingSupplementalProbe({
        metrics: zeroMetrics,
        loadState: "loaded",
        walletProof: "empty",
        partnershipProbeState: "error",
      }),
    ).toBe(false);
  });

  it("uses wallet fixture with all numeric fields zero", () => {
    expect(EMPTY_MASTER_WALLET_FIXTURE.pendingRub).toBe(0);
    expect(EMPTY_MASTER_WALLET_FIXTURE.count).toBe(0);
  });
});
