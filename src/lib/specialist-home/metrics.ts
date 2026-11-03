import type { CertificateListResponse } from "@/lib/certificate-types";
import type { WalletBalanceResponse } from "@/lib/history-types";

export type SpecialistHomeMetricSlice =
  | { state: "loading" }
  | { state: "ok"; value: number }
  | { state: "empty" }
  | { state: "error"; message: string };

export type SpecialistHomeMoneySlice =
  | { state: "loading" }
  | { state: "ok"; rub: number }
  | { state: "empty" }
  | { state: "error"; message: string };

export type SpecialistHomeMetrics = {
  certificates: SpecialistHomeMetricSlice;
  accrued: SpecialistHomeMoneySlice;
  received: SpecialistHomeMoneySlice;
};

export const initialSpecialistHomeMetrics: SpecialistHomeMetrics = {
  certificates: { state: "loading" },
  accrued: { state: "loading" },
  received: { state: "loading" },
};

const walletMoneyFieldUnavailable = "Недоступно";

function specialistHomeWalletMoneySlice(value: unknown): SpecialistHomeMoneySlice {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { state: "ok", rub: value };
  }
  return { state: "error", message: walletMoneyFieldUnavailable };
}

export function specialistHomeMetricsFromWallet(
  wallet: WalletBalanceResponse | null,
  walletError: string | null,
): Pick<SpecialistHomeMetrics, "accrued" | "received"> {
  if (walletError) {
    const slice = { state: "error" as const, message: walletError };
    return { accrued: slice, received: slice };
  }
  if (!wallet || wallet.role !== "MASTER") {
    const slice = {
      state: "error" as const,
      message: "Финансовые показатели недоступны в этом контексте",
    };
    return { accrued: slice, received: slice };
  }
  return {
    accrued: specialistHomeWalletMoneySlice(wallet.totalRub),
    received: specialistHomeWalletMoneySlice(wallet.paidRub),
  };
}

export function specialistHomeCertificateMetric(
  list: CertificateListResponse | null,
  certError: string | null,
): SpecialistHomeMetricSlice {
  if (certError) {
    return { state: "error", message: certError };
  }
  if (!list || !Array.isArray(list.certificates)) {
    return { state: "error", message: "Не удалось загрузить сертификаты" };
  }
  return { state: "ok", value: list.certificates.length };
}
