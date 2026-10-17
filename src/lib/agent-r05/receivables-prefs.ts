export type LedgerView = "list" | "small" | "medium" | "large";

export const RECEIVABLES_PREFS_KEY = "agent-r05-receivables-prefs";

export const DEFAULT_RECEIVABLES_PREFS: { view: LedgerView; pageSize: number } = {
  view: "list",
  pageSize: 25,
};

const LEDGER_VIEWS = new Set<LedgerView>(["list", "small", "medium", "large"]);
const PAGE_SIZES = new Set([25, 50, 100]);

/** SSR and first client paint — never reads localStorage. */
export function defaultReceivablesPrefs() {
  return { ...DEFAULT_RECEIVABLES_PREFS };
}

export function parseReceivablesPrefs(raw: string | null | undefined): {
  view: LedgerView;
  pageSize: number;
} {
  if (!raw) return defaultReceivablesPrefs();
  try {
    const parsed = JSON.parse(raw) as { view?: unknown; pageSize?: unknown };
    const pageSize = PAGE_SIZES.has(Number(parsed.pageSize))
      ? (Number(parsed.pageSize) as 25 | 50 | 100)
      : DEFAULT_RECEIVABLES_PREFS.pageSize;
    const viewCandidate = parsed.view;
    const view =
      typeof viewCandidate === "string" && LEDGER_VIEWS.has(viewCandidate as LedgerView)
        ? (viewCandidate as LedgerView)
        : DEFAULT_RECEIVABLES_PREFS.view;
    return { view, pageSize };
  } catch {
    return defaultReceivablesPrefs();
  }
}

/** Client-only: read validated prefs from localStorage (after mount). */
export function loadReceivablesPrefsFromStorage(): { view: LedgerView; pageSize: number } {
  if (typeof window === "undefined") return defaultReceivablesPrefs();
  try {
    return parseReceivablesPrefs(localStorage.getItem(RECEIVABLES_PREFS_KEY));
  } catch {
    return defaultReceivablesPrefs();
  }
}

export function saveReceivablesPrefs(view: LedgerView, pageSize: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RECEIVABLES_PREFS_KEY, JSON.stringify({ view, pageSize }));
  } catch {
    /* ignore quota / private mode */
  }
}
