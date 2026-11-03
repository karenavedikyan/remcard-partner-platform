import { beforeEach, describe, expect, it, vi } from "vitest";

const upstreamCalls = vi.hoisted(() => ({ count: 0, paths: [] as string[] }));

vi.mock("@/lib/remcard-server", () => ({
  fetchRemcardUpstream: vi.fn(async (path: string) => {
    upstreamCalls.count += 1;
    upstreamCalls.paths.push(path);
    if (path === "/api/auth/me") {
      return {
        ok: true,
        data: { user: { id: "u1", role: "PRO", isBlocked: false }, profTestSession: null },
      };
    }
    if (path === "/api/account/cabinet-readiness") {
      return {
        ok: true,
        data: {
          canAccessCabinet: true,
          isEmployee: false,
          isAdmin: false,
          needsProfileOnboarding: false,
          missingConsents: [],
        },
      };
    }
    if (path === "/api/partnership/list") {
      return { ok: true, data: { partnerships: [] } };
    }
    if (path === "/api/pro/cabinet-ui-preferences") {
      return {
        ok: true,
        data: {
          contractVersion: "2026-10-14.r01",
          pilotEnabled: false,
          pilotActive: false,
          contextKey: null,
          version: 0,
          theme: null,
          mobileNavKeys: null,
          permittedKeys: null,
          defaultMobileNavKeys: null,
        },
      };
    }
    return { ok: false, status: 404, message: "missing", configured: true };
  }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "session=test" }),
}));

function createTestRequestCache<T extends (...args: never[]) => unknown>(fn: T): T {
  const map = new Map<string, ReturnType<T>>();
  return ((...args: never[]) => {
    const key = JSON.stringify(args);
    if (!map.has(key)) {
      map.set(key, fn(...args) as ReturnType<T>);
    }
    return map.get(key)!;
  }) as T;
}

describe("cabinet shell upstream dedupe (request-scoped)", () => {
  beforeEach(async () => {
    upstreamCalls.count = 0;
    upstreamCalls.paths = [];
    vi.resetModules();
    const { __setRequestCacheForTests: setCache } = await import("@/lib/request-cache");
    setCache(createTestRequestCache);
  });

  it("dedupes auth/me and cabinet-readiness across page guard + shell loader", async () => {
    const { requireProPageUser } = await import("@/lib/session");
    const { loadCabinetShellClientProps } = await import("@/lib/cabinet-shell-data");

    const user = await requireProPageUser("/clients");
    expect(user?.id).toBe("u1");
    await loadCabinetShellClientProps(user!);

    const authMeCalls = upstreamCalls.paths.filter((p) => p === "/api/auth/me").length;
    const readinessCalls = upstreamCalls.paths.filter(
      (p) => p === "/api/account/cabinet-readiness",
    ).length;
    const listCalls = upstreamCalls.paths.filter((p) => p === "/api/partnership/list").length;
    const prefsCalls = upstreamCalls.paths.filter(
      (p) => p === "/api/pro/cabinet-ui-preferences",
    ).length;

    expect(authMeCalls).toBe(1);
    expect(readinessCalls).toBe(1);
    expect(listCalls).toBe(1);
    expect(prefsCalls).toBe(1);
  });

  it("loads shell upstreams in parallel (single wave)", async () => {
    const { loadCabinetShellClientProps } = await import("@/lib/cabinet-shell-data");
    const user = { id: "u1", role: "PRO" as const, isBlocked: false };

    await loadCabinetShellClientProps(user);

    expect(upstreamCalls.count).toBe(3);
    expect(new Set(upstreamCalls.paths)).toEqual(
      new Set([
        "/api/auth/me",
        "/api/partnership/list",
        "/api/pro/cabinet-ui-preferences",
      ]),
    );
  });
});
