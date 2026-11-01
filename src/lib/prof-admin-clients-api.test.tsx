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

import { beforeEach, describe, expect, it, vi } from "vitest";

const remcardFetch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

import {
  ADMIN_CLIENTS_FROZEN_MAPPING,
  assertAdminUserFunnelRole,
  buildAdminClientsQueryString,
  buildAdminUserFunnelQueryString,
  fetchAdminClients,
  getAdminClientTotal,
  getAdminUserFunnel,
  parseAdminClientsFunnel,
  parseAdminClientsTotal,
  whitelistAdminClient,
  whitelistAdminClientsResponse,
} from "./prof-admin-clients-api";

describe("A21a/A21c prof-admin-clients-api", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
  });

  it("always forces role=CLIENT and funnelRole=CLIENT in the query string", () => {
    expect(buildAdminClientsQueryString({})).toBe(
      "role=CLIENT&funnelRole=CLIENT&page=1&limit=10",
    );
    expect(buildAdminClientsQueryString({ search: "анна", period: "week", page: 2 })).toBe(
      "role=CLIENT&funnelRole=CLIENT&page=2&limit=10&period=week&search=%D0%B0%D0%BD%D0%BD%D0%B0",
    );
    expect(buildAdminClientsQueryString({ sort: "displayName", order: "asc" })).toContain(
      "funnelRole=CLIENT",
    );
    expect(buildAdminClientsQueryString({ period: "all" })).not.toContain("period=");
    expect(buildAdminClientsQueryString({ funnel: "profileFilled" })).toContain(
      "funnel=profileFilled",
    );
    expect(buildAdminClientsQueryString({ funnel: "all" })).not.toContain("funnel=");
  });

  it("whitelists CLIENT rows and drops PRO/staff", () => {
    expect(
      whitelistAdminClient({
        id: "c1",
        publicId: "RC-C1",
        displayName: "Клиент Один",
        role: "CLIENT",
        city: "Краснодар",
        createdAt: "2025-01-01T00:00:00.000Z",
        isBlocked: false,
        staffRole: null,
        partnerType: "AGENT",
        stage: "order",
        clientBonus: { balance: 9 },
      }),
    ).toEqual({
      id: "c1",
      publicId: "RC-C1",
      displayName: "Клиент Один",
      role: "CLIENT",
      city: "Краснодар",
      photoUrl: null,
      clientAvatarUrl: null,
      isBlocked: false,
      createdAt: "2025-01-01T00:00:00.000Z",
    });
    expect(
      whitelistAdminClient({
        id: "p1",
        publicId: "RC-P1",
        displayName: "Партнёр",
        role: "PRO",
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
    expect(
      whitelistAdminClient({
        id: "s1",
        publicId: "RC-S1",
        displayName: "Сотрудник",
        role: "PRO",
        staffRole: "ADMIN",
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("parses list total/page/funnel and filters mixed role payloads", () => {
    const parsed = whitelistAdminClientsResponse({
      users: [
        {
          id: "c1",
          publicId: "RC-C1",
          displayName: "Клиент",
          role: "CLIENT",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
        {
          id: "p1",
          publicId: "RC-P1",
          displayName: "PRO",
          role: "PRO",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      total: 42,
      page: 3,
      totalPages: 5,
      funnel: {
        registered: 99,
        profileFilled: 80,
        firstAction: 40,
        activeRecently: 12,
        pctProfile: 81,
        pctFirst: 50,
        pctActive: 30,
      },
    });
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0]!.role).toBe("CLIENT");
    expect(parsed.total).toBe(42);
    expect(parsed.page).toBe(3);
    expect(parsed.totalPages).toBe(5);
    expect(parsed.funnel?.registered).toBe(99);
    expect(parsed.funnel?.activeRecently).toBe(12);
    // Incomplete funnel must not invent zeros for missing deal stages
    expect(parseAdminClientsFunnel({ registered: 99 })).toBeNull();
  });

  it("fetchAdminClients calls exact users path with role+funnelRole=CLIENT", async () => {
    remcardFetch.mockResolvedValue({
      users: [
        {
          id: "c1",
          publicId: "RC-C1",
          displayName: "Клиент",
          role: "CLIENT",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
      funnel: {
        registered: 1,
        profileFilled: 1,
        firstAction: 0,
        activeRecently: 0,
        pctProfile: 100,
        pctFirst: 0,
        pctActive: 0,
      },
    });
    const res = await fetchAdminClients({ search: "кл", page: 1, funnel: "firstAction" });
    expect(remcardFetch).toHaveBeenCalledTimes(1);
    const path = remcardFetch.mock.calls[0]![0] as string;
    expect(path.startsWith("/api/admin/users?")).toBe(true);
    expect(path).toContain("role=CLIENT");
    expect(path).toContain("funnelRole=CLIENT");
    expect(path).toContain("funnel=firstAction");
    expect(path).not.toMatch(/role=PRO|role=STAFF|funnelRole=all|funnelRole=PRO/);
    expect(res.total).toBe(1);
    expect(res.funnel?.registered).toBe(1);
  });

  it("documents frozen↔BE mapping without claiming deal-stage parity", () => {
    const gaps = ADMIN_CLIENTS_FROZEN_MAPPING.filter((row) => row.verdict === "gap");
    expect(gaps.some((g) => /заявк/i.test(g.frozen))).toBe(true);
    expect(gaps.some((g) => /Источник/i.test(g.frozen))).toBe(true);
    expect(gaps.some((g) => /Этап/i.test(g.frozen))).toBe(true);
    expect(
      ADMIN_CLIENTS_FROZEN_MAPPING.some(
        (g) => g.verdict === "match" && /Клиентов в базе/i.test(g.frozen),
      ),
    ).toBe(true);
  });

  it("getAdminClientTotal is all-time CLIENT only (no period/search)", async () => {
    remcardFetch.mockResolvedValue({
      users: [
        {
          id: "c1",
          publicId: "RC-C1",
          displayName: "Клиент",
          role: "CLIENT",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      total: 126,
      page: 1,
      totalPages: 126,
    });
    await expect(getAdminClientTotal()).resolves.toBe(126);
    const path = remcardFetch.mock.calls[0]![0] as string;
    expect(path).toBe("/api/admin/users?role=CLIENT&page=1&limit=1");
    expect(path).not.toContain("period=");
    expect(path).not.toContain("search=");
    expect(path).not.toContain("q=");
    expect(path).not.toContain("funnel=");
  });

  it("getAdminUserFunnel requires explicit CLIENT|PRO and isolates snapshots", async () => {
    expect(buildAdminUserFunnelQueryString("CLIENT")).toBe(
      "role=CLIENT&funnelRole=CLIENT&page=1&limit=1",
    );
    expect(buildAdminUserFunnelQueryString("PRO")).toBe(
      "role=PRO&funnelRole=PRO&page=1&limit=1",
    );
    expect(() => assertAdminUserFunnelRole("all")).toThrow(/CLIENT\|PRO/);
    expect(() => assertAdminUserFunnelRole(undefined)).toThrow(/CLIENT\|PRO/);

    remcardFetch.mockResolvedValueOnce({
      users: [],
      total: 120,
      page: 1,
      totalPages: 120,
      funnel: {
        registered: 120,
        profileFilled: 90,
        firstAction: 55,
        activeRecently: 40,
        pctProfile: 75,
        pctFirst: 61,
        pctActive: 73,
      },
    });
    await expect(getAdminUserFunnel("CLIENT")).resolves.toMatchObject({ registered: 120 });
    expect(remcardFetch.mock.calls[0]![0]).toBe(
      "/api/admin/users?role=CLIENT&funnelRole=CLIENT&page=1&limit=1",
    );

    remcardFetch.mockResolvedValueOnce({
      users: [],
      total: 45,
      page: 1,
      totalPages: 45,
      funnel: {
        registered: 45,
        profileFilled: 38,
        firstAction: 22,
        activeRecently: 15,
        pctProfile: 84,
        pctFirst: 58,
        pctActive: 68,
      },
    });
    await expect(getAdminUserFunnel("PRO")).resolves.toMatchObject({ registered: 45 });
    expect(remcardFetch.mock.calls[1]![0]).toBe(
      "/api/admin/users?role=PRO&funnelRole=PRO&page=1&limit=1",
    );
    expect(remcardFetch.mock.calls[1]![0]).not.toContain("period=");
    expect(remcardFetch.mock.calls[1]![0]).not.toContain("search=");
  });

  it("parseAdminClientsTotal coerces null/string and never uses list length", () => {
    expect(parseAdminClientsTotal(null)).toBe(0);
    expect(parseAdminClientsTotal(undefined)).toBe(0);
    expect(parseAdminClientsTotal("17")).toBe(17);
    expect(parseAdminClientsTotal(-3)).toBe(0);
    expect(
      whitelistAdminClientsResponse({ users: [{ id: "x" }], total: null }).total,
    ).toBe(0);
    expect(
      whitelistAdminClientsResponse({
        users: [
          {
            id: "c1",
            publicId: "RC-C1",
            displayName: "Клиент",
            role: "CLIENT",
            createdAt: "2025-01-01T00:00:00.000Z",
          },
        ],
        total: "5",
      }).total,
    ).toBe(5);
  });

  it("buildAdminClientsQueryString never emits q=", () => {
    expect(buildAdminClientsQueryString({ search: "anna" })).toContain("search=anna");
    expect(buildAdminClientsQueryString({ search: "anna" })).not.toContain("q=");
  });
});
