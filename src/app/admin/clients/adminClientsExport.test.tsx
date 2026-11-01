import { describe, expect, it, vi } from "vitest";
import type { AdminClient, AdminClientsListResponse } from "@/lib/prof-admin-clients-api";
import {
  ADMIN_CLIENTS_EXPORT_HEADERS,
  ADMIN_CLIENTS_EXPORT_MAX_ROWS,
  adminClientToExportRow,
  buildAdminClientsCsv,
  buildAdminClientsExportFilename,
  collectAdminClientsForExport,
  csvEscapeField,
  csvFormulaSafe,
} from "./adminClientsExport";

function client(n: number, overrides: Partial<AdminClient> = {}): AdminClient {
  return {
    id: `c-${n}`,
    publicId: `RC-C${String(n).padStart(3, "0")}`,
    displayName: `Клиент ${n}`,
    role: "CLIENT",
    city: n % 2 ? "Ростов-на-Дону" : null,
    photoUrl: null,
    clientAvatarUrl: null,
    isBlocked: n === 7,
    createdAt: `2025-02-${String(10 + (n % 15)).padStart(2, "0")}T00:00:00.000Z`,
    ...overrides,
  };
}

function pageResponse(
  users: AdminClient[],
  total: number,
  page: number,
  limit: number,
): AdminClientsListResponse {
  return {
    users,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    funnel: null,
  };
}

describe("adminClientsExport CSV safety", () => {
  it("neutralizes formula-leading cells and doubles quotes", () => {
    expect(csvFormulaSafe("=CMD")).toBe("'=CMD");
    expect(csvFormulaSafe("+1")).toBe("'+1");
    expect(csvFormulaSafe("-total")).toBe("'-total");
    expect(csvFormulaSafe("@sum")).toBe("'@sum");
    expect(csvFormulaSafe("Клиент")).toBe("Клиент");
    expect(csvEscapeField('Имя "Кавычка"')).toBe('"Имя ""Кавычка"""');
    expect(csvEscapeField("=1+1")).toBe("\"'=1+1\"");
  });

  it("builds UTF-8 BOM CSV with only DTO columns (no source/stage/consent)", () => {
    const csv = buildAdminClientsCsv([
      client(1, { displayName: "Анна", city: "Сочи", isBlocked: false }),
      client(2, {
        displayName: "=Evil",
        city: "Ростов-на-Дону",
        isBlocked: true,
        createdAt: "bad-date",
      }),
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(ADMIN_CLIENTS_EXPORT_HEADERS).toEqual([
      "ID",
      "Клиент",
      "Город",
      "Регистрация",
      "Заблокирован",
    ]);
    expect(csv).toContain('"ID";"Клиент";"Город";"Регистрация";"Заблокирован"');
    expect(csv).toContain('"RC-C001";"Анна";"Сочи";"2025-02-11";"Нет"');
    expect(csv).toContain("\"'=Evil\"");
    expect(csv).toContain('"Да"');
    expect(csv).not.toMatch(/Источник|Этап|Согласие|email|phone|consent|partner/i);
    expect(csv).not.toContain("c-1"); // internal UUID/id withheld
    // CRLF line endings
    expect(csv.includes("\r\n")).toBe(true);
  });

  it("maps DTO row without inventing unavailable fields", () => {
    expect(adminClientToExportRow(client(7, { displayName: "  ", city: null }))).toEqual([
      "RC-C007",
      "",
      "",
      "2025-02-17",
      "Да",
    ]);
  });

  it("builds a clear dated filename respecting period/search", () => {
    const at = new Date(Date.UTC(2026, 10, 1));
    expect(buildAdminClientsExportFilename({ period: "all" }, at)).toBe(
      "remcard-clients-2026-11-01.csv",
    );
    expect(buildAdminClientsExportFilename({ period: "week" }, at)).toBe(
      "remcard-clients-week-2026-11-01.csv",
    );
    expect(buildAdminClientsExportFilename({ search: "Анна Клиент" }, at)).toMatch(
      /^remcard-clients-search-анна-клиент-2026-11-01\.csv$/,
    );
  });
});

describe("collectAdminClientsForExport paging", () => {
  it("walks all matching pages so export is 23 not visible 10", async () => {
    const all = Array.from({ length: 23 }, (_, i) => client(i + 1));
    const fetchPage = vi.fn(async ({ page, limit }: { page: number; limit: number }) => {
      const start = (page - 1) * limit;
      return pageResponse(all.slice(start, start + limit), 23, page, limit);
    });

    const result = await collectAdminClientsForExport({
      fetchPage,
      pageLimit: 10,
      search: "",
      period: "all",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.clients).toHaveLength(23);
    expect(result.total).toBe(23);
    expect(result.pagesFetched).toBe(3);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage.mock.calls[0]![0]).toMatchObject({ page: 1, limit: 10, period: "all" });
    expect(fetchPage.mock.calls[1]![0]).toMatchObject({ page: 2, limit: 10 });
    expect(fetchPage.mock.calls[2]![0]).toMatchObject({ page: 3, limit: 10 });
    // Must not stop after first page length === 10.
    expect(result.clients.map((c) => c.publicId)).toContain("RC-C023");
  });

  it("respects current search and period on every page request", async () => {
    const fetchPage = vi.fn(async () => pageResponse([client(5)], 1, 1, 100));
    await collectAdminClientsForExport({
      fetchPage,
      search: " Анна ",
      period: "month",
    });
    expect(fetchPage).toHaveBeenCalledWith(
      expect.objectContaining({ search: "Анна", period: "month", page: 1, limit: 100 }),
    );
  });

  it("reuses stable createdFrom/createdTo on every export page and forces period=all", async () => {
    const all = Array.from({ length: 23 }, (_, i) => client(i + 1));
    const fetchPage = vi.fn(async ({ page, limit }: { page: number; limit: number }) => {
      const start = (page - 1) * limit;
      return pageResponse(all.slice(start, start + limit), 23, page, limit);
    });
    const createdFrom = "2026-08-03T21:00:00.000Z";
    const createdTo = "2026-11-01T20:59:59.999Z";
    const result = await collectAdminClientsForExport({
      fetchPage,
      pageLimit: 10,
      period: "week", // must be ignored when range is set
      createdFrom,
      createdTo,
    });
    expect(result.ok).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    for (const call of fetchPage.mock.calls) {
      expect(call[0]).toMatchObject({
        period: "all",
        createdFrom,
        createdTo,
      });
    }
  });

  it("refuses over-cap totals without returning a partial success", async () => {
    const fetchPage = vi.fn(async () =>
      pageResponse([client(1)], ADMIN_CLIENTS_EXPORT_MAX_ROWS + 1, 1, 100),
    );
    const result = await collectAdminClientsForExport({ fetchPage });
    expect(result).toMatchObject({
      ok: false,
      reason: "cap",
      fetched: 0,
      total: ADMIN_CLIENTS_EXPORT_MAX_ROWS + 1,
    });
    expect(result.ok === false && result.message).toMatch(/Лимит/);
  });

  it("cancels without completing and reports cancelled", async () => {
    const controller = new AbortController();
    const fetchPage = vi.fn(async ({ page }: { page: number }) => {
      if (page === 1) {
        return pageResponse(
          Array.from({ length: 10 }, (_, i) => client(i + 1)),
          23,
          1,
          10,
        );
      }
      controller.abort();
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    const result = await collectAdminClientsForExport({
      fetchPage,
      pageLimit: 10,
      signal: controller.signal,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("cancelled");
    expect(result.fetched).toBe(10);
  });

  it("fails honestly on mid-export error — incomplete is not ok", async () => {
    const fetchPage = vi.fn(async ({ page }: { page: number }) => {
      if (page === 1) {
        return pageResponse(
          Array.from({ length: 10 }, (_, i) => client(i + 1)),
          23,
          1,
          10,
        );
      }
      throw new Error("upstream 503");
    });
    const result = await collectAdminClientsForExport({ fetchPage, pageLimit: 10 });
    expect(result).toMatchObject({
      ok: false,
      reason: "error",
      message: "upstream 503",
      fetched: 10,
      total: 23,
    });
  });

  it("detects incomplete page walk when counts diverge", async () => {
    const fetchPage = vi.fn(async ({ page }: { page: number }) => {
      if (page === 1) {
        return pageResponse(
          Array.from({ length: 10 }, (_, i) => client(i + 1)),
          23,
          1,
          10,
        );
      }
      // Early empty page while BE total still says 23 → refuse, no file.
      return { users: [], total: 23, page: 2, totalPages: 3, funnel: null };
    });
    const result = await collectAdminClientsForExport({ fetchPage, pageLimit: 10 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("incomplete");
    expect(result.message).toMatch(/неполная/i);
    expect(result.fetched).toBe(10);
    expect(result.total).toBe(23);
  });
});
