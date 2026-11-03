import type { BusinessHomePartnerType } from "@/lib/business-home/copy";
import type { BusinessHomeMetricSlice } from "@/lib/business-home/metrics-types";
import type { SpecialistHomeMetrics } from "@/lib/specialist-home/metrics";
import type {
  CompanyLifetimeActivityProbe,
  StoreLifetimeActivityProbe,
  SupplementalProbeState,
} from "./activity-probes";
import type { WalletEmptyProof } from "./wallet-empty-proof";

function companyBranchAllowsEmptyHome(primary: BusinessHomeMetricSlice): boolean {
  if (primary.state === "empty") return true;
  if (primary.state === "ok" && primary.value === 1) return true;
  return false;
}

function businessMetricsBlockEmpty(
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice],
): boolean {
  return slices.some(
    (s) =>
      s.state === "error" ||
      s.state === "unavailable" ||
      s.state === "needs_branch" ||
      s.state === "invalid_branch",
  );
}

function storeOwnerHomeMetricsEligibleForEmptyCheck(
  branchSelectionRequired: boolean,
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice],
): boolean {
  if (branchSelectionRequired) return false;
  if (businessMetricsBlockEmpty(slices)) return false;
  return slices.every((s) => s.state === "empty");
}

function companyOwnerHomeMetricsEligibleForEmptyCheck(
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice],
): boolean {
  if (businessMetricsBlockEmpty(slices)) return false;
  const [primary, secondary, tertiary] = slices;
  if (secondary.state !== "empty") return false;
  if (tertiary.state !== "empty") return false;
  return companyBranchAllowsEmptyHome(primary);
}

export function businessOwnerHomeMetricsEligibleForEmptyCheck(params: {
  partnerType: BusinessHomePartnerType;
  branchSelectionRequired: boolean;
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice];
}): boolean {
  if (params.partnerType === "STORE") {
    return storeOwnerHomeMetricsEligibleForEmptyCheck(
      params.branchSelectionRequired,
      params.slices,
    );
  }
  return companyOwnerHomeMetricsEligibleForEmptyCheck(params.slices);
}

export function specialistHomeMetricsEligibleForEmptyCheck(
  metrics: SpecialistHomeMetrics,
  loadState: "loading" | "loaded",
  walletProof: WalletEmptyProof,
): boolean {
  if (loadState !== "loaded") return false;
  if (walletProof !== "empty") return false;
  if (
    metrics.certificates.state === "error" ||
    metrics.accrued.state === "error" ||
    metrics.received.state === "error"
  ) {
    return false;
  }
  if (metrics.certificates.state !== "ok" || metrics.certificates.value !== 0) {
    return false;
  }
  if (metrics.accrued.state !== "ok" || metrics.accrued.rub !== 0) {
    return false;
  }
  if (metrics.received.state !== "ok" || metrics.received.rub !== 0) {
    return false;
  }
  return true;
}

export function shouldShowSpecialistHomeEmpty(params: {
  metrics: SpecialistHomeMetrics;
  loadState: "loading" | "loaded";
  walletProof: WalletEmptyProof;
  partnershipProbeState: SupplementalProbeState;
  partnershipCount: number | null;
}): boolean {
  if (
    !specialistHomeMetricsEligibleForEmptyCheck(
      params.metrics,
      params.loadState,
      params.walletProof,
    )
  ) {
    return false;
  }
  if (params.partnershipProbeState === "loading") return false;
  if (params.partnershipProbeState !== "ok") return false;
  if (params.partnershipCount === null) return false;
  return params.partnershipCount === 0;
}

export function specialistHomePendingSupplementalProbe(params: {
  metrics: SpecialistHomeMetrics;
  loadState: "loading" | "loaded";
  walletProof: WalletEmptyProof;
  partnershipProbeState: SupplementalProbeState;
}): boolean {
  if (params.loadState !== "loaded") return false;
  if (
    !specialistHomeMetricsEligibleForEmptyCheck(
      params.metrics,
      params.loadState,
      params.walletProof,
    )
  ) {
    return false;
  }
  return (
    params.partnershipProbeState === "idle" || params.partnershipProbeState === "loading"
  );
}

export function businessOwnerHomePendingSupplementalProbe(params: {
  loadState: "loading" | "loaded";
  partnerType: BusinessHomePartnerType;
  branchSelectionRequired: boolean;
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice];
  storeProbe: StoreLifetimeActivityProbe;
  companyProbe: CompanyLifetimeActivityProbe;
}): boolean {
  if (params.loadState !== "loaded") return false;
  if (
    !businessOwnerHomeMetricsEligibleForEmptyCheck({
      partnerType: params.partnerType,
      branchSelectionRequired: params.branchSelectionRequired,
      slices: params.slices,
    })
  ) {
    return false;
  }
  if (params.partnerType === "STORE") {
    return params.storeProbe.state === "idle" || params.storeProbe.state === "loading";
  }
  return params.companyProbe.state === "idle" || params.companyProbe.state === "loading";
}

export function shouldShowStoreOwnerHomeEmpty(params: {
  loadState: "loading" | "loaded";
  branchSelectionRequired: boolean;
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice];
  probe: StoreLifetimeActivityProbe;
}): boolean {
  if (params.loadState !== "loaded") return false;
  if (params.branchSelectionRequired) return false;
  if (
    !storeOwnerHomeMetricsEligibleForEmptyCheck(
      params.branchSelectionRequired,
      params.slices,
    )
  ) {
    return false;
  }
  if (businessMetricsBlockEmpty(params.slices)) return false;
  if (params.probe.state === "loading") return false;
  if (params.probe.state !== "ok") return false;
  if (!params.probe.ordersOk || params.probe.hasLifetimeOrders !== false) return false;
  if (!params.probe.partnershipsOk || params.probe.partnershipCount !== 0) return false;
  return true;
}

export function shouldShowCompanyOwnerHomeEmpty(params: {
  loadState: "loading" | "loaded";
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice];
  probe: CompanyLifetimeActivityProbe;
}): boolean {
  if (params.loadState !== "loaded") return false;
  if (businessMetricsBlockEmpty(params.slices)) return false;
  if (!companyOwnerHomeMetricsEligibleForEmptyCheck(params.slices)) return false;

  if (params.probe.state === "loading") return false;
  if (params.probe.state !== "ok") return false;
  if (!params.probe.partnershipsOk || params.probe.partnershipCount !== 0) return false;
  return true;
}

export function shouldShowBusinessOwnerHomeEmpty(params: {
  loadState: "loading" | "loaded";
  partnerType: BusinessHomePartnerType;
  branchSelectionRequired: boolean;
  slices: [BusinessHomeMetricSlice, BusinessHomeMetricSlice, BusinessHomeMetricSlice];
  storeProbe: StoreLifetimeActivityProbe;
  companyProbe: CompanyLifetimeActivityProbe;
}): boolean {
  if (params.partnerType === "STORE") {
    return shouldShowStoreOwnerHomeEmpty({
      loadState: params.loadState,
      branchSelectionRequired: params.branchSelectionRequired,
      slices: params.slices,
      probe: params.storeProbe,
    });
  }
  return shouldShowCompanyOwnerHomeEmpty({
    loadState: params.loadState,
    slices: params.slices,
    probe: params.companyProbe,
  });
}
