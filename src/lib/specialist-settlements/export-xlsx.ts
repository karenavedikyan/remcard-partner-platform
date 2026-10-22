import { remcardFetchBlob } from "@/lib/api-client";
import type { SettlementDirection, SettlementLedgerFilters, SettlementExportScope } from "./ledger";

function buildExportQuery(input: {
  scope: SettlementExportScope;
  direction: SettlementDirection;
  filters: SettlementLedgerFilters;
  counterpartyId?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("scope", input.scope);
  params.set("direction", input.direction);
  params.set("q", input.filters.q);
  if (input.scope === "open") {
    params.set("status", input.filters.status);
  }
  params.set("from", input.filters.from);
  params.set("to", input.filters.to);
  params.set("sort", input.filters.sort);
  if (input.counterpartyId) params.set("counterpartyId", input.counterpartyId);
  return params.toString();
}

export async function downloadMasterSettlementsXlsx(input: {
  scope: SettlementExportScope;
  direction: SettlementDirection;
  filters: SettlementLedgerFilters;
  counterpartyId?: string | null;
}): Promise<void> {
  const qs = buildExportQuery(input);
  const { blob, filename } = await remcardFetchBlob(
    `/api/pro/wallet/settlements/export?${qs}`,
    { method: "POST" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `RemCard-master-settlements-${input.scope}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
