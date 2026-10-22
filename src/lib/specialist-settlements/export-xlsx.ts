import { remcardFetchBlob } from "@/lib/api-client";
import type { SettlementDirection, SettlementLedgerFilters } from "./ledger";

function buildExportQuery(
  direction: SettlementDirection,
  filters: SettlementLedgerFilters,
  counterpartyId?: string | null,
): string {
  const params = new URLSearchParams();
  params.set("direction", direction);
  params.set("q", filters.q);
  params.set("status", filters.status);
  params.set("from", filters.from);
  params.set("to", filters.to);
  params.set("sort", filters.sort);
  if (counterpartyId) params.set("counterpartyId", counterpartyId);
  return params.toString();
}

export async function downloadMasterSettlementsXlsx(input: {
  direction: SettlementDirection;
  filters: SettlementLedgerFilters;
  counterpartyId?: string | null;
}): Promise<void> {
  const qs = buildExportQuery(input.direction, input.filters, input.counterpartyId);
  const { blob, filename } = await remcardFetchBlob(
    `/api/pro/wallet/settlements/export?${qs}`,
    { method: "POST" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `RemCard-master-settlements-${input.direction}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
