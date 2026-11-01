/**
 * A21h — full Clients CSV export over the existing admin read API.
 *
 * Pages through every matching page (not just the visible table page of 10).
 * Columns are limited to AdminClient DTO fields already shown on this page.
 * Does not invent source / deal stage / consent / contacts / projects.
 * Does not edit prof-admin-clients-api / Analytics / Shell / BE.
 */

import {
  fetchAdminClients,
  type AdminClient,
  type AdminClientPeriod,
  type AdminClientsListResponse,
} from "@/lib/prof-admin-clients-api";

/** BE max page size — fewer round-trips while still walking all pages. */
export const ADMIN_CLIENTS_EXPORT_PAGE_LIMIT = 100;

/** Explicit hard cap — refuse to pretend a truncated dump is complete. */
export const ADMIN_CLIENTS_EXPORT_MAX_ROWS = 50_000;

/** CSV headers — DTO-backed only (frozen demo Этап/Источник omitted). */
export const ADMIN_CLIENTS_EXPORT_HEADERS = [
  "ID",
  "Клиент",
  "Город",
  "Регистрация",
  "Заблокирован",
] as const;

export type AdminClientsExportProgress = {
  fetched: number;
  total: number;
  page: number;
  totalPages: number;
};

export type AdminClientsExportFilters = {
  search?: string;
  /** Legacy calendar period — omit/`all` when createdFrom/createdTo are set. */
  period?: AdminClientPeriod;
  /** Stable A22g registration endpoints (captured once; not recomputed mid-export). */
  createdFrom?: string;
  createdTo?: string;
};

export type CollectAdminClientsForExportOptions = AdminClientsExportFilters & {
  signal?: AbortSignal;
  onProgress?: (progress: AdminClientsExportProgress) => void;
  maxRows?: number;
  pageLimit?: number;
  /** Injectable for tests — defaults to fetchAdminClients. */
  fetchPage?: (query: {
    page: number;
    limit: number;
    search?: string;
    period?: AdminClientPeriod;
    createdFrom?: string;
    createdTo?: string;
    signal?: AbortSignal;
  }) => Promise<AdminClientsListResponse>;
};

export type CollectAdminClientsForExportResult =
  | {
      ok: true;
      clients: AdminClient[];
      total: number;
      pagesFetched: number;
    }
  | {
      ok: false;
      reason: "cancelled" | "cap" | "error" | "incomplete";
      message: string;
      fetched?: number;
      total?: number;
    };

function isAbortError(caught: unknown): boolean {
  if (!caught || typeof caught !== "object") return false;
  const name = (caught as { name?: string }).name;
  return name === "AbortError" || name === "TimeoutError";
}

/** Prefix formula-triggering cells so Excel/LibreOffice do not execute them. */
export function csvFormulaSafe(value: string): string {
  const text = String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** RFC-style CSV field quoting with doubled inner quotes. */
export function csvEscapeField(value: string): string {
  const safe = csvFormulaSafe(value);
  return `"${safe.replaceAll('"', '""')}"`;
}

function cellCity(client: AdminClient): string {
  const city = client.city?.trim();
  return city ? city : "";
}

function cellName(client: AdminClient): string {
  return client.displayName?.trim() ? client.displayName.trim() : "";
}

/** Prefer ISO date (YYYY-MM-DD) for stable UTF-8 CSV; unknown → empty. */
export function formatClientExportRegisteredAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function adminClientToExportRow(client: AdminClient): string[] {
  return [
    client.publicId,
    cellName(client),
    cellCity(client),
    formatClientExportRegisteredAt(client.createdAt),
    client.isBlocked ? "Да" : "Нет",
  ];
}

/**
 * Build UTF-8 CSV with BOM + CRLF + `;` separator (frozen R1 / RU Excel).
 * Never includes source, stage, consent, email, phone, or internal UUID.
 */
export function buildAdminClientsCsv(clients: AdminClient[]): string {
  const lines = [
    [...ADMIN_CLIENTS_EXPORT_HEADERS],
    ...clients.map((c) => adminClientToExportRow(c)),
  ].map((row) => row.map((cell) => csvEscapeField(cell)).join(";"));
  return `\uFEFF${lines.join("\r\n")}`;
}

export function buildAdminClientsExportFilename(
  filters: AdminClientsExportFilters = {},
  at: Date = new Date(),
): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  const d = String(at.getUTCDate()).padStart(2, "0");
  const hasRange = Boolean(filters.createdFrom || filters.createdTo);
  const period =
    !hasRange && filters.period && filters.period !== "all" ? `-${filters.period}` : "";
  const rangePart = hasRange ? "-registration-range" : "";
  const search = (filters.search ?? "").trim();
  const searchPart = search
    ? `-search-${search
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 32)}`
    : "";
  return `remcard-clients${period}${rangePart}${searchPart}-${y}-${m}-${d}.csv`;
}

export function downloadAdminClientsCsv(csv: string, filename: string): void {
  // Encode explicitly so the UTF-8 BOM survives Blob construction in all runtimes.
  const bytes = new TextEncoder().encode(csv);
  const blob = new Blob([bytes], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Fetch every matching page for the current search/period.
 * Fails closed on cancel, hard cap, network error, or incomplete page walk.
 * Does not download — caller builds CSV only after `ok: true`.
 */
export async function collectAdminClientsForExport(
  options: CollectAdminClientsForExportOptions = {},
): Promise<CollectAdminClientsForExportResult> {
  const maxRows = options.maxRows ?? ADMIN_CLIENTS_EXPORT_MAX_ROWS;
  const pageLimit = Math.min(
    ADMIN_CLIENTS_EXPORT_PAGE_LIMIT,
    Math.max(1, options.pageLimit ?? ADMIN_CLIENTS_EXPORT_PAGE_LIMIT),
  );
  const fetchPage = options.fetchPage ?? fetchAdminClients;
  const search = (options.search ?? "").trim();
  // Capture stable endpoints once — never recompute createdFrom/To during the walk.
  const createdFrom = options.createdFrom?.trim() || undefined;
  const createdTo = options.createdTo?.trim() || undefined;
  const hasRange = Boolean(createdFrom || createdTo);
  const period: AdminClientPeriod = hasRange ? "all" : (options.period ?? "all");
  const signal = options.signal;

  if (signal?.aborted) {
    return { ok: false, reason: "cancelled", message: "Выгрузка отменена." };
  }

  const collected: AdminClient[] = [];
  let page = 1;
  let total = 0;
  let totalPages = 1;
  let pagesFetched = 0;

  try {
    while (page <= totalPages) {
      if (signal?.aborted) {
        return {
          ok: false,
          reason: "cancelled",
          message: "Выгрузка отменена.",
          fetched: collected.length,
          total,
        };
      }

      const res = await fetchPage({
        page,
        limit: pageLimit,
        search: search || undefined,
        period,
        createdFrom,
        createdTo,
        signal,
      });
      pagesFetched += 1;

      if (page === 1) {
        total = res.total;
        totalPages = Math.max(1, res.totalPages || Math.ceil(total / pageLimit) || 1);
        if (total > maxRows) {
          return {
            ok: false,
            reason: "cap",
            message: `Слишком много записей для выгрузки (${total}). Лимит — ${maxRows}. Сузьте поиск или период.`,
            fetched: 0,
            total,
          };
        }
      }

      collected.push(...res.users);
      options.onProgress?.({
        fetched: collected.length,
        total,
        page,
        totalPages,
      });

      if (res.users.length === 0) break;
      if (collected.length >= total && total > 0) break;
      if (page >= totalPages) break;
      page += 1;
    }
  } catch (caught) {
    if (isAbortError(caught) || signal?.aborted) {
      return {
        ok: false,
        reason: "cancelled",
        message: "Выгрузка отменена.",
        fetched: collected.length,
        total,
      };
    }
    const message =
      caught instanceof Error && caught.message
        ? caught.message
        : "Не удалось загрузить клиентов для выгрузки.";
    return {
      ok: false,
      reason: "error",
      message,
      fetched: collected.length,
      total,
    };
  }

  if (signal?.aborted) {
    return {
      ok: false,
      reason: "cancelled",
      message: "Выгрузка отменена.",
      fetched: collected.length,
      total,
    };
  }

  // Honest completeness: when BE reports a positive total, require a full match.
  if (total > 0 && collected.length !== total) {
    return {
      ok: false,
      reason: "incomplete",
      message: `Выгрузка неполная: получено ${collected.length} из ${total}. Файл не создан.`,
      fetched: collected.length,
      total,
    };
  }

  return { ok: true, clients: collected, total, pagesFetched };
}
