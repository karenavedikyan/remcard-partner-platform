import type {
  SettlementCompleted,
  SettlementObligation,
  SettlementsResponse,
} from "./settlements-types";

function openRowDedupeKey(row: SettlementObligation): string {
  return `${row.accrualType}:${row.id}`;
}

function completedRowDedupeKey(row: SettlementCompleted): string {
  return `${row.direction}:${row.accrualType}:${row.id}`;
}

function dedupeOpenRows(rows: SettlementObligation[]): SettlementObligation[] {
  const seen = new Set<string>();
  const out: SettlementObligation[] = [];
  for (const row of rows) {
    const key = openRowDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function dedupeCompletedRows(rows: SettlementCompleted[]): SettlementCompleted[] {
  const seen = new Set<string>();
  const out: SettlementCompleted[] = [];
  for (const row of rows) {
    const key = completedRowDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Merge per-branch settlements payloads; preserve row objects, no amount recompute. */
export function mergeSettlementsResponses(responses: SettlementsResponse[]): SettlementsResponse {
  if (responses.length === 0) {
    return { receivable: [], payable: [], completed: [], coverageNote: "" };
  }
  if (responses.length === 1) {
    return responses[0]!;
  }

  const receivable: SettlementObligation[] = [];
  const payable: SettlementObligation[] = [];
  const completed: SettlementCompleted[] = [];
  const notes = new Set<string>();

  for (const chunk of responses) {
    receivable.push(...chunk.receivable);
    payable.push(...chunk.payable);
    completed.push(...chunk.completed);
    const note = chunk.coverageNote?.trim();
    if (note) notes.add(note);
  }

  return {
    receivable: dedupeOpenRows(receivable),
    payable: dedupeOpenRows(payable),
    completed: dedupeCompletedRows(completed),
    coverageNote: [...notes].join(" · ") || responses[0]!.coverageNote || "",
  };
}
