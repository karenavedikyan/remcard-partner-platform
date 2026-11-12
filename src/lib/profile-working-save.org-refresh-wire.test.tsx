/**
 * Real HTTP wire: organization-only persist must GET-refresh profile (no stale org in UI).
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { profileDraftFromProfile } from "./profile-draft-sync";
import { persistWorkingProfileDraft } from "./profile-working-save";
import type { ProProfileResponse } from "./types";

type WireCall = { method: string; path: string; body: Record<string, unknown> | null };
let current: ProProfileResponse;
let calls: WireCall[] = [];
let baseUrl: string;
const nativeFetch = globalThis.fetch;

function storeProfile(): ProProfileResponse {
  return {
    organization: {
      id: "org-wire",
      name: "Магазин Юг",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: 0,
      website: null,
      telegram: null,
    },
    programs: [],
    workingProfile: {
      productCategoryIds: [],
      serviceSpecializationIds: [],
      navigatorStageIds: [],
      effectiveProductCategoryIds: [],
      effectiveServiceSpecializationIds: [],
      effectiveNavigatorStageIds: [],
      primaryDirection: null,
      partnerSearchVisible: true,
      partnerSearchOptIn: true,
      partnerSearchOptInExplicit: true,
      partnerWorkMode: null,
      areas: [],
      partnershipContactName: null,
      partnershipContactPhone: null,
      partnershipContactEmail: null,
    },
    user: {
      id: "u-org-wire",
      publicId: "RC-ORG",
      displayName: "Алексей",
      city: "Краснодар",
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      catalogStatus: "DRAFT",
      isPublic: false,
      specializations: [],
      description: null,
      rejectionReason: null,
      badges: [],
      photoUrl: null,
      storeCategories: [],
      areas: [],
      website: null,
      telegram: null,
      whatsapp: null,
      instagram: null,
      vk: null,
      max: null,
      yandex: null,
      publicEmail: null,
      publicPhone: null,
      showFullName: false,
    },
  };
}

const server = http.createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  calls.push({ method: req.method!, path: req.url!, body });
  const send = (payload: unknown, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  };

  if (req.url === "/api/remcard/api/pro/organization" && req.method === "GET") {
    return send({ organization: current.organization });
  }
  if (req.url === "/api/remcard/api/pro/organization" && req.method === "PATCH") {
    if (current.organization) {
      if (typeof body?.name === "string") current.organization.name = body.name as string;
      if (body?.website !== undefined) current.organization.website = body.website as string | null;
      if (body?.telegram !== undefined) current.organization.telegram = body.telegram as string | null;
    }
    return send({ organization: current.organization });
  }
  if (req.url === "/api/remcard/api/pro/organization" && req.method === "POST") {
    current.organization = {
      id: "org-created",
      name: (body!.name as string) ?? "",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: 0,
      website: (body!.website as string | null) ?? null,
      telegram: (body!.telegram as string | null) ?? null,
    };
    return send({ organization: current.organization });
  }
  if (req.url === "/api/remcard/api/pro/profile" && req.method === "PATCH") {
    const keys = body ? Object.keys(body) : [];
    if (keys.length === 0) {
      return send({ error: "Нет полей для обновления." }, 400);
    }
    if (Object.hasOwn(body!, "city")) {
      current.user.city = body!.city as string;
    }
    return send({ user: current.user });
  }
  if (req.url === "/api/remcard/api/pro/profile" && req.method === "GET") {
    return send(current);
  }
  return send({ error: `Unexpected ${req.method} ${req.url}` }, 500);
});

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(() => {
  current = storeProfile();
  calls = [];
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) =>
    nativeFetch(new URL(String(input), baseUrl), init));
});
afterEach(() => vi.unstubAllGlobals());

describe("persistWorkingProfileDraft org-only wire refresh", () => {
  it("renames organization without profile PATCH and returns refreshed org name", async () => {
    const draft = {
      ...profileDraftFromProfile(current),
      organizationName: "Магазин Оптовик",
    };
    const result = await persistWorkingProfileDraft(current, draft, {
      validationIntent: "cabinet",
      validationScope: "basics",
    });
    const profilePatches = calls.filter(
      (c) => c.path === "/api/remcard/api/pro/profile" && c.method === "PATCH",
    );
    expect(profilePatches).toHaveLength(0);
    expect(calls).toContainEqual({
      method: "PATCH",
      path: "/api/remcard/api/pro/organization",
      body: { name: "Магазин Оптовик", partnerType: "STORE" },
    });
    expect(calls.at(-1)).toEqual({
      method: "GET",
      path: "/api/remcard/api/pro/profile",
      body: null,
    });
    expect(result.organization?.name).toBe("Магазин Оптовик");
    expect(profileDraftFromProfile(result).organizationName).toBe("Магазин Оптовик");
  });

  it("creates organization when missing and refreshes profile", async () => {
    current = { ...storeProfile(), organization: null };
    const draft = {
      ...profileDraftFromProfile(current),
      organizationName: "Новый магазин",
      displayName: "Алексей",
      city: "Краснодар",
    };
    const result = await persistWorkingProfileDraft(current, draft, {
      validationIntent: "cabinet",
      validationScope: "basics",
    });
    expect(calls.some((c) => c.method === "POST" && c.path === "/api/remcard/api/pro/organization")).toBe(
      true,
    );
    expect(result.organization?.name).toBe("Новый магазин");
    expect(
      calls.filter((c) => c.path === "/api/remcard/api/pro/profile" && c.method === "PATCH"),
    ).toHaveLength(0);
  });

  it("org site/telegram update does not PATCH categories or visibility", async () => {
    const draft = {
      ...profileDraftFromProfile(current),
      website: "https://shop.example",
      telegram: "@shop",
    };
    await persistWorkingProfileDraft(current, draft, {
      validationIntent: "cabinet",
      validationScope: "contacts",
    });
    const profilePatch = calls.find(
      (c) => c.path === "/api/remcard/api/pro/profile" && c.method === "PATCH",
    );
    expect(profilePatch).toBeUndefined();
    const orgPatch = calls.find(
      (c) => c.path === "/api/remcard/api/pro/organization" && c.method === "PATCH",
    );
    expect(orgPatch?.body).toEqual({
      website: "https://shop.example",
      telegram: "@shop",
    });
    expect(orgPatch?.body).not.toHaveProperty("partnerSearchOptIn");
    expect(orgPatch?.body).not.toHaveProperty("productCategoryIds");
  });
});
