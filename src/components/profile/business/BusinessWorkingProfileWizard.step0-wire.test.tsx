/**
 * @vitest-environment jsdom
 */
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("@/components/profile/agent/AgentPhoneField", () => ({
  AgentPhoneField: () => null,
}));

vi.mock("@/components/profile/ProfileDirectionsPicker", () => ({
  ProfileDirectionsPicker: () => <div data-testid="directions-panel-mock" />,
}));

function storeExplicitOnEmptyCategories(): ProProfileResponse {
  return {
    organization: {
      id: "org-legacy",
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
      partnershipContactPhone: "+79001112233",
      partnershipContactEmail: null,
    },
    user: {
      id: "u-legacy",
      publicId: "RC-LEGACY",
      displayName: "Алексей",
      city: "Краснодар",
      specializations: [],
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      description: null,
      catalogStatus: "DRAFT",
      isPublic: false,
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

let current: ProProfileResponse;
type WireCall = { method: string; path: string; body: Record<string, unknown> | null };
let calls: WireCall[] = [];
let baseUrl: string;
const nativeFetch = globalThis.fetch;

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
  if (req.url?.startsWith("/api/remcard/api/pro/organization")) {
    return send({ organization: current.organization });
  }
  return send({ error: "Unexpected" }, 500);
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
  current = storeExplicitOnEmptyCategories();
  calls = [];
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) =>
    nativeFetch(new URL(String(input), baseUrl), init));
});
afterEach(() => vi.unstubAllGlobals());

describe("BusinessWorkingProfileWizard step0 wire PATCH", () => {
  it("no-op Continue advances without profile PATCH", async () => {
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={current}
        partnerType="STORE"
        basicsEditable
        forceEditing
        forceStep={0}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));
    expect(await screen.findByTestId("business-profile-directions-panel")).toBeInTheDocument();
    expect(calls.filter((c) => c.path === "/api/remcard/api/pro/profile" && c.method === "PATCH"))
      .toHaveLength(0);
    expect(calls.filter((c) => c.path === "/api/remcard/api/pro/profile" && c.method === "GET"))
      .toHaveLength(1);
  });

  it("changed city emits ordinary PATCH without invented fields", async () => {
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={current}
        partnerType="STORE"
        basicsEditable
        forceEditing
        forceStep={0}
      />,
    );
    const city = screen.getByLabelText(/^Город/i);
    await user.clear(city);
    await user.type(city, "Сочи");
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));
    await waitFor(() =>
      expect(
        calls.some(
          (c) =>
            c.path === "/api/remcard/api/pro/profile" &&
            c.method === "PATCH" &&
            c.body?.city === "Сочи",
        ),
      ).toBe(true),
    );
    const profilePatch = calls.find(
      (c) => c.path === "/api/remcard/api/pro/profile" && c.method === "PATCH",
    );
    expect(profilePatch?.body).toEqual({ city: "Сочи" });
    expect(profilePatch?.body).not.toHaveProperty("workingProfileSaveIntent");
    expect(profilePatch?.body).not.toHaveProperty("partnerSearchOptIn");
  });

  it("step0 does not require partnership contact name when phone saved on server", async () => {
    const user = userEvent.setup();
    render(
      <BusinessWorkingProfileWizard
        initialProfile={current}
        partnerType="STORE"
        basicsEditable
        forceEditing
        forceStep={0}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Продолжить/i }));
    expect(screen.queryByText(/контактное лицо/i)).toBeNull();
    expect(await screen.findByTestId("business-profile-directions-panel")).toBeInTheDocument();
  });
});
