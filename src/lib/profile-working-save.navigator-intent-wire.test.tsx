/**
 * Synthetic Navigator PATCH semantics (c439e519-style): infer strictness from body,
 * not client-only markers.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { profileDraftFromProfile } from "./profile-draft-sync";
import { persistWorkingProfileDraft } from "./profile-working-save";
import type { ProProfileResponse, WorkingProfileDto } from "./types";

function explicitOnIncomplete(over: Partial<WorkingProfileDto> = {}): ProProfileResponse {
  return {
    organization: {
      id: "org-store",
      name: "Магазин Юг",
      catalogStatus: "DRAFT",
      partnerType: "STORE",
      branchCount: 0,
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
      ...over,
    },
    user: {
      id: "wire-user",
      publicId: "RC-WIRE",
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

type WireCall = { method: string; path: string; body: Record<string, unknown> | null };
let current: ProProfileResponse;
let calls: WireCall[] = [];
let baseUrl: string;
const nativeFetch = globalThis.fetch;

function validateNavigatorPatch(body: Record<string, unknown> | null): string | null {
  const keys = body ? Object.keys(body) : [];
  if (keys.length === 0) {
    return "Нет полей для обновления.";
  }
  if (body!.workingProfileSaveIntent != null) {
    return "Unexpected workingProfileSaveIntent";
  }
  const w = current.workingProfile;
  const hasCategories =
    (w?.productCategoryIds?.length ?? 0) > 0 || (w?.serviceSpecializationIds?.length ?? 0) > 0;
  const incompleteExplicitOn =
    Boolean(w?.partnerSearchOptInExplicit && w.partnerSearchOptIn && !hasCategories);
  if (body!.partnerSearchOptIn === true && incompleteExplicitOn) {
    return "Для видимости в поиске укажите хотя бы одну категорию товаров или услуг.";
  }
  if (
    incompleteExplicitOn &&
    Array.isArray(body!.productCategoryIds) &&
    (body!.productCategoryIds as string[]).length === 0
  ) {
    return "Для видимости в поиске укажите хотя бы одну категорию товаров или услуг.";
  }
  return null;
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
  if (req.url === "/api/remcard/api/pro/profile" && req.method === "PATCH") {
    const err = validateNavigatorPatch(body);
    if (err) return send({ error: err }, 400);
    if (Object.hasOwn(body!, "city")) {
      current.user.city = body!.city as string;
    }
    if (Object.hasOwn(body!, "partnerSearchOptIn")) {
      const enabled = body!.partnerSearchOptIn as boolean;
      Object.assign(current.workingProfile!, {
        partnerSearchOptIn: enabled,
        partnerSearchOptInExplicit: true,
        partnerSearchVisible: enabled,
      });
    }
    return send({ user: current.user });
  }
  if (req.url === "/api/remcard/api/pro/profile" && req.method === "GET") {
    return send(current);
  }
  return send({ error: "Unexpected path" }, 500);
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
  current = explicitOnIncomplete();
  calls = [];
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) =>
    nativeFetch(new URL(String(input), baseUrl), init));
});
afterEach(() => vi.unstubAllGlobals());

describe("Navigator PATCH semantics wire contract", () => {
  it("rejects empty PATCH body", async () => {
    const res = await fetch(`${baseUrl}/api/remcard/api/pro/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toMatch(/Нет полей/);
  });

  it("permits incremental city-only PATCH without invented marker", async () => {
    const draft = { ...profileDraftFromProfile(current), city: "Сочи" };
    const result = await persistWorkingProfileDraft(current, draft, {
      validationIntent: "cabinet",
      validationScope: "basics",
    });
    expect(calls[0]?.body).toEqual({ city: "Сочи" });
    expect(calls[0]?.body).not.toHaveProperty("workingProfileSaveIntent");
    expect(result.user.city).toBe("Сочи");
  });

  it("client does not PATCH when draft matches server on cabinet step", async () => {
    const draft = profileDraftFromProfile(current);
    await persistWorkingProfileDraft(current, draft, {
      validationIntent: "cabinet",
      validationScope: "basics",
    });
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(0);
    expect(calls.filter((c) => c.method === "GET")).toHaveLength(1);
  });

  it("rejects activation enable without categories on the wire", async () => {
    current = explicitOnIncomplete({
      partnerSearchOptIn: false,
      partnerSearchVisible: false,
    });
    const draft = { ...profileDraftFromProfile(current), partnerSearchOptIn: true };
    await expect(
      persistWorkingProfileDraft(current, draft, {
        partnerSearchTouched: true,
        validationIntent: "activation",
        validationScope: "full",
      }),
    ).rejects.toThrow(/категорию товаров или услуг/);
    expect(calls).toEqual([]);
  });
});
