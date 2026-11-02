/** @vitest-environment node */
const mem = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    clear: () => mem.clear(),
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
    key: (i: number) => [...mem.keys()][i] ?? null,
    get length() {
      return mem.size;
    },
  },
});

/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  buildStaffAccessAuditPath,
  formatStaffAccessAuditMetaDetail,
  parseStaffAccessAuditResponse,
} from "./adminSettingsModel";

describe("parseStaffAccessAuditResponse A35b", () => {
  it("maps backend journal shape with nextCursor and safe meta", () => {
    const result = parseStaffAccessAuditResponse({
      items: [
        {
          id: "a1",
          action: "ADMIN_USER_UPDATED",
          createdAt: "2026-01-01T12:00:00.000Z",
          actor: { displayName: "Owner", publicId: "RC-OWN" },
          target: { displayName: "Admin", publicId: "RC-ADM" },
          meta: { changedFields: ["staffRole"], sessionInvalidated: true, login: "secret" },
        },
      ],
      hasMore: true,
      nextCursor: "cur-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.page.hasMore).toBe(true);
    expect(result.page.nextCursor).toBe("cur-1");
    expect(result.page.items[0]?.actionLabel).toBe("Изменение доступа администратора");
    expect(result.page.items[0]?.actorLabel).toBe("Owner (RC-OWN)");
    expect(result.page.items[0]?.detailLine).toContain("staffRole");
    expect(result.page.items[0]?.detailLine).not.toContain("secret");
    expect(JSON.stringify(result.page.items)).not.toMatch(/login|password/i);
  });

  it("errors on malformed body without inventing rows", () => {
    expect(parseStaffAccessAuditResponse(null).ok).toBe(false);
    expect(parseStaffAccessAuditResponse({}).ok).toBe(false);
  });

  it("fails closed for malformed rows, duplicates and unsupported actions", () => {
    const row = { id: "one", action: "ADMIN_USER_UPDATED", createdAt: "2026-01-01T00:00:00Z" };
    const page = (items: unknown[]) => ({ items, hasMore: false, nextCursor: null });
    for (const items of [[null], [{}], [row, {}], [row, row], [{ ...row, action: "OTHER" }], [{ ...row, createdAt: "not-a-date" }]]) {
      expect(parseStaffAccessAuditResponse(page(items)).ok).toBe(false);
    }
  });

  it("rejects cursor incoherence rather than displaying false empty or looping", () => {
    const row = { id: "one", action: "ADMIN_USER_UPDATED", createdAt: "2026-01-01T00:00:00Z" };
    for (const page of [
      { items: [], hasMore: true, nextCursor: "next" },
      { items: [row], hasMore: true, nextCursor: null },
      { items: [row], hasMore: true, nextCursor: " " },
      { items: [row], hasMore: false, nextCursor: "unexpected" },
      { items: [row], hasMore: "false", nextCursor: null },
      { items: [row], hasMore: false },
    ]) expect(parseStaffAccessAuditResponse(page).ok).toBe(false);
  });

  it("accepts real backend nullable historical identities and valid empty page", () => {
    const result = parseStaffAccessAuditResponse({
      items: [{ id: "historical", action: "ADMIN_USER_UPDATED", createdAt: "2026-01-01T00:00:00Z", actor: null, target: null }],
      hasMore: false,
      nextCursor: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.items[0]?.actorLabel).toBeNull();
      expect(result.page.items[0]?.targetLabel).toBeNull();
    }
    expect(parseStaffAccessAuditResponse({ items: [], hasMore: false, nextCursor: null })).toEqual({
      ok: true, page: { items: [], hasMore: false, nextCursor: null },
    });
  });

  it("buildStaffAccessAuditPath encodes cursor", () => {
    expect(buildStaffAccessAuditPath(25, null)).toBe("/api/pro/admin/access/audit?limit=25");
    expect(buildStaffAccessAuditPath(25, "a+b")).toContain("cursor=a%2Bb");
  });
});

describe("formatStaffAccessAuditMetaDetail", () => {
  it("returns null for empty meta", () => {
    expect(formatStaffAccessAuditMetaDetail({})).toBeNull();
  });

  it("only renders four actual backend changed-field keys and session flag", () => {
    expect(formatStaffAccessAuditMetaDetail({
      changedFields: ["role", "staffRole", "staffPosition", "isBlocked", "staffRole", "password", "secret value"],
      before: { password: "never render" },
      after: { token: "never render" },
      sessionInvalidated: true,
    })).toBe("Изменённые поля: role, staffRole, staffPosition, isBlocked · Сессии пользователя сброшены");
  });
});
