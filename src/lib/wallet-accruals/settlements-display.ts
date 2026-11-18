import type { SettlementsResponse } from "@/lib/settlements-types";
import type { WalletAccrualsData } from "@/lib/wallet-accruals/types";

const UPSTREAM_COVERAGE_NOTE =
  /Показаны взаиморасчёты по подтверждённым покупкам \(order-linked\)\.\s*Начисления без связи с покупкой и legacy-заказы без certificatePartner не включены\./g;

const PUBLIC_COVERAGE_NOTE =
  "Показаны расчёты по подтверждённым покупкам. Начисления без связи с покупкой не включены.";

/** Sentences that only make sense to developers: task codes, English terms, field names. */
const TECHNICAL_SENTENCE =
  /\bR0\d\b|principal agent|order-linked|\blegacy\b|certificatePartner|\bFixture\b/i;

/**
 * User-facing text for the settlements coverage note: the known server wording is replaced with plain
 * Russian and any remaining developer-only sentence (task codes, English terms) is dropped.
 */
export function publicSettlementsCoverageNote(note: string | undefined | null): string | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;
  const replaced = trimmed.replace(UPSTREAM_COVERAGE_NOTE, PUBLIC_COVERAGE_NOTE);
  const sentences = replaced.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [replaced];
  const kept = sentences.map((s) => s.trim()).filter((s) => s && !TECHNICAL_SENTENCE.test(s));
  const result = kept.join(" ").trim();
  return result || null;
}

/** Client-side incoming-only view: hide forbidden directions/actions even if server sends wider payload. */
export function applyClientIncomingOnlySettlementsView(
  response: SettlementsResponse,
): SettlementsResponse {
  return {
    ...response,
    payable: [],
    receivable: response.receivable.map((row) => ({
      ...row,
      payoutActions: undefined,
    })),
    completed: response.completed.filter((row) => row.direction !== "payable"),
  };
}

export function toAccrualsData(response: SettlementsResponse): WalletAccrualsData {
  return {
    receivable: response.receivable,
    payable: response.payable,
    completed: response.completed,
  };
}
