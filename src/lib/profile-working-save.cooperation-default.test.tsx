/**
 * @vitest-environment jsdom
 *
 * Real persist + api-client serialization against a synthetic loopback HTTP
 * server. Only the relative browser URL is rebased; no persist/fetch API module
 * is mocked and no production backend, credentials or database are used.
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { profileDraftFromProfile } from "./profile-draft-sync";
import { persistWorkingProfileDraft, validateWorkingProfileDraft, workingProfileCabinetReady } from "./profile-working-save";
import type { ProfileDraft } from "./profile-save";
import type { ProProfileResponse, WorkingProfileDto } from "./types";

function fixture(working: Partial<WorkingProfileDto> = {}): ProProfileResponse {
  return {
    organization: null,
    programs: [],
    workingProfile: {
      productCategoryIds: [], serviceSpecializationIds: [], navigatorStageIds: [],
      effectiveProductCategoryIds: [], effectiveServiceSpecializationIds: [], effectiveNavigatorStageIds: [],
      primaryDirection: null, workingDirectionsTouched: false,
      partnerSearchVisible: true, partnerSearchOptIn: false, partnerSearchOptInExplicit: false,
      partnerWorkMode: null, areas: [], partnershipContactName: null,
      partnershipContactPhone: null, partnershipContactEmail: null,
      ...working,
    },
    user: {
      id: "synthetic-policy", publicId: "RC-SYNTHETIC-POLICY",
      displayName: "Иван", city: "Краснодар", role: "PRO", partnerType: "MASTER",
      partnerActivities: ["MASTER"], catalogStatus: "DRAFT", isPublic: false,
      specializations: [], description: null, rejectionReason: null, badges: [],
      photoUrl: null, storeCategories: [], areas: [], website: null, telegram: null,
      whatsapp: null, instagram: null, vk: null, max: null, yandex: null,
      publicEmail: null, publicPhone: null, showFullName: false,
    },
  };
}

type WireCall = { method: string; path: string; body: Record<string, unknown> | null };
let current: ProProfileResponse;
let calls: WireCall[] = [];
let baseUrl: string;
const nativeFetch = globalThis.fetch;
const server = http.createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) as Record<string, unknown> : null;
  calls.push({ method: req.method!, path: req.url!, body });
  const send = (payload: unknown, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  };
  if (req.url === "/api/remcard/api/auth/me" && req.method === "PATCH") {
    current.user.displayName = body!.displayName as string;
    return send({ user: current.user });
  }
  if (req.url !== "/api/remcard/api/pro/profile") return send({ error: "Unexpected path" }, 500);
  if (req.method === "GET") return send(current);
  if (req.method !== "PATCH") return send({ error: "Unexpected method" }, 500);
  if (Object.hasOwn(body!, "city")) current.user.city = body!.city as string;
  if (Object.hasOwn(body!, "partnerSearchOptIn")) {
    const enabled = body!.partnerSearchOptIn as boolean;
    Object.assign(current.workingProfile!, {
      partnerSearchOptIn: enabled, partnerSearchOptInExplicit: true, partnerSearchVisible: enabled,
    });
  }
  return send({ user: current.user });
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
  current = fixture();
  calls = [];
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) =>
    nativeFetch(new URL(String(input), baseUrl), init));
});
afterEach(() => vi.unstubAllGlobals());

describe("cooperation AUTO default real working-profile HTTP save chain", () => {
  it("saves unrelated city with AUTO true/no directions and omits the visibility flag", async () => {
    const draft = { ...profileDraftFromProfile(current), city: "Сочи" };
    expect(draft.partnerSearchOptIn).toBe(true);
    const result = await persistWorkingProfileDraft(current, draft);
    expect(calls).toEqual([
      { method: "PATCH", path: "/api/remcard/api/pro/profile", body: { city: "Сочи" } },
      { method: "GET", path: "/api/remcard/api/pro/profile", body: null },
    ]);
    expect(result.user.city).toBe("Сочи");
    expect(result.workingProfile?.partnerSearchOptInExplicit).toBe(false);
    expect(result.workingProfile?.partnerSearchVisible).toBe(true);
  });

  it("saves representative name via real auth PATCH without converting AUTO into explicit ON", async () => {
    const result = await persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), displayName: "Пётр",
    }, { partnerSearchTouched: false });
    expect(calls).toEqual([
      { method: "PATCH", path: "/api/remcard/api/auth/me", body: { displayName: "Пётр" } },
      { method: "GET", path: "/api/remcard/api/pro/profile", body: null },
    ]);
    expect(result.user.displayName).toBe("Пётр");
    expect(result.workingProfile?.partnerSearchOptInExplicit).toBe(false);
  });

  it("does not serialize an untouched visibility difference", async () => {
    await persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), city: "Сочи", partnerSearchOptIn: false,
    }, { partnerSearchTouched: false });
    expect(calls[0].body).toEqual({ city: "Сочи" });
    expect(current.workingProfile?.partnerSearchVisible).toBe(true);
    expect(current.workingProfile?.partnerSearchOptInExplicit).toBe(false);
  });

  it("serializes explicit opt-out as false, even with no directions", async () => {
    const result = await persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), partnerSearchOptIn: false,
    }, { partnerSearchTouched: true });
    expect(calls[0]).toEqual({
      method: "PATCH", path: "/api/remcard/api/pro/profile", body: { partnerSearchOptIn: false },
    });
    expect(result.workingProfile?.partnerSearchVisible).toBe(false);
    expect(result.workingProfile?.partnerSearchOptInExplicit).toBe(true);
  });

  it("preserves already explicit hidden without resending the flag", async () => {
    current = fixture({
      partnerSearchOptIn: false, partnerSearchOptInExplicit: true, partnerSearchVisible: false,
    });
    const result = await persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), city: "Сочи",
    });
    expect(calls[0].body).toEqual({ city: "Сочи" });
    expect(result.workingProfile?.partnerSearchOptIn).toBe(false);
    expect(result.workingProfile?.partnerSearchVisible).toBe(false);
  });

  it("rejects an explicit ON attempt without directions before any HTTP request", async () => {
    current = fixture({ partnerSearchVisible: false });
    await expect(persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), partnerSearchOptIn: true,
    }, { partnerSearchTouched: true })).rejects.toThrow(/категорию товаров или услуг/);
    expect(calls).toEqual([]);
  });

  it("still requires directions after touching AUTO ON, even if its boolean matches the default", async () => {
    await expect(persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), city: "Сочи",
    }, { partnerSearchTouched: true })).rejects.toThrow(/категорию товаров или услуг/);
    expect(calls).toEqual([]);
  });

  it("retains the minimum for an already explicit ON profile during an unrelated save", async () => {
    current = fixture({ partnerSearchOptIn: true, partnerSearchOptInExplicit: true });
    await expect(persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), city: "Сочи",
    })).rejects.toThrow(/категорию товаров или услуг/);
    expect(calls).toEqual([]);
  });

  it("cannot remove the last direction from an existing explicit ON profile", async () => {
    current = fixture({
      partnerSearchOptIn: true, partnerSearchOptInExplicit: true,
      productCategoryIds: ["doors"], effectiveProductCategoryIds: ["doors"],
    });
    await expect(persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), productCategoryIds: [],
    })).rejects.toThrow(/категорию товаров или услуг/);
    expect(calls).toEqual([]);
  });

  it("serializes explicit ON when canonical directions are already present", async () => {
    current = fixture({
      partnerSearchVisible: false, productCategoryIds: ["doors"], effectiveProductCategoryIds: ["doors"],
    });
    const result = await persistWorkingProfileDraft(current, {
      ...profileDraftFromProfile(current), partnerSearchOptIn: true,
    }, { partnerSearchTouched: true });
    expect(calls[0].body).toEqual({ partnerSearchOptIn: true });
    expect(result.workingProfile?.partnerSearchOptInExplicit).toBe(true);
    expect(result.workingProfile?.partnerSearchVisible).toBe(true);
  });
});

describe("AUTO context does not weaken other working-profile guards", () => {
  const context = () => ({ profile: current, partnerSearchTouched: false });

  it("keeps strict backwards-compatible no-context direction validation", () => {
    const draft = profileDraftFromProfile(current);
    expect(validateWorkingProfileDraft(draft)).toMatch(/видимости/);
    expect(validateWorkingProfileDraft(draft, context())).toBeNull();
    expect(workingProfileCabinetReady(draft)).toBe(true);
  });

  it.each([
    [{ displayName: "Пользователь" }, /имя представителя/],
    [{ displayName: "Я" }, /имя представителя/],
    [{ city: " " }, /город/],
    [{ partnerType: "" }, /тип партнёра/],
    [{ partnerType: "STORE", organizationName: "" }, /название организации/],
    [{ partnerType: "COMPANY", organizationName: "Я" }, /название организации/],
    [{ partnershipContactPhone: "+79001112233", partnershipContactName: "" }, /контактное лицо/],
    [{ partnershipContactEmail: "synthetic@example.test", partnershipContactName: "" }, /контактное лицо/],
    [{ primaryDirection: { kind: "product", id: "missing" } }, /Основное направление/],
    [{
      productCategoryIds: ["doors"], serviceSpecializationIds: [],
      primaryDirection: { kind: "service", id: "doors" },
    }, /Основное направление/],
  ] as [Partial<ProfileDraft>, RegExp][])("preserves guard for %j", (patch, message) => {
    expect(validateWorkingProfileDraft({ ...profileDraftFromProfile(current), ...patch }, context()))
      .toMatch(message);
  });
});
