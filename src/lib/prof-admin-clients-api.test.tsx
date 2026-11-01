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
  buildAdminClientsQueryString,
  fetchAdminClients,
  getAdminClientTotal,
  parseAdminClientsTotal,
  whitelistAdminClient,
  whitelistAdminClientsResponse,
} from "./prof-admin-clients-api";

describe("A21a prof-admin-clients-api", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
  });

  it("always forces role=CLIENT in the query string", () => {
    expect(buildAdminClientsQueryString({})).toBe("role=CLIENT&page=1&limit=10");
    expect(buildAdminClientsQueryString({ search: "анна", period: "week", page: 2 })).toBe(
      "role=CLIENT&page=2&limit=10&period=week&search=%D0%B0%D0%BD%D0%BD%D0%B0",
    );
    expect(buildAdminClientsQueryString({ sort: "displayName", order: "asc" })).toContain(
      "role=CLIENT",
    );
    expect(buildAdminClientsQueryString({ period: "all" })).not.toContain("period=");
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

  it("parses list total/page and filters mixed role payloads", () => {
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
      funnel: { registered: 99 },
    });
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0]!.role).toBe("CLIENT");
    expect(parsed.total).toBe(42);
    expect(parsed.page).toBe(3);
    expect(parsed.totalPages).toBe(5);
  });

  it("fetchAdminClients calls exact users path with role=CLIENT", async () => {
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
    });
    const res = await fetchAdminClients({ search: "кл", page: 1 });
    expect(remcardFetch).toHaveBeenCalledTimes(1);
    const path = remcardFetch.mock.calls[0]![0] as string;
    expect(path.startsWith("/api/admin/users?")).toBe(true);
    expect(path).toContain("role=CLIENT");
    expect(path).not.toMatch(/role=PRO|role=STAFF/);
    expect(res.total).toBe(1);
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
