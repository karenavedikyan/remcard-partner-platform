/** @vitest-environment jsdom */
/**
 * A3a layout-pin suite superseded by owner R1 Partners parity
 * (`AdminPartnersR1ParityPresentation.test.tsx`).
 * Kept as a thin behavioral smoke for filter→API contracts under the new chrome.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";

const ROOT = path.join(__dirname);
const CLIENT = path.join(ROOT, "AdminPartnersClient.tsx");

const facets = {
  matchedTotal: 12,
  partnerKind: {
    all: 12,
    agent: 3,
    specialist: 4,
    store: 2,
    company: 2,
    unknown: 1,
    facetRule: "ignores_partner_type",
  },
  registration: { active: 8, demo: 4, facetRule: "with_other_filters" },
  catalog: { visible: 5, hidden: 3, notPublic: 4, facetRule: "with_other_filters" },
  archive: { archived: 2, notArchived: 10, facetRule: "with_other_filters" },
};

function registryPayload(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        id: "p1",
        displayName: "Тест Партнёр",
        partnerType: "AGENT",
        registrationLabel: "ACTIVE",
        catalogVisibility: "VISIBLE",
        city: "Краснодар",
        lifecycle: null,
        partnershipCounts: { active: 0, invited: 0, pending: 0, paused: 0, ended: 0, total: 0 },
      },
    ],
    total: 12,
    nextCursor: null,
    facets,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
  window.localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
  api.fetchPartnerRegistry.mockResolvedValue(registryPayload());
});

describe("A3a superseded — R1 filter contracts", () => {
  it("documents supersession: old SHA freeze replaced by R1 presentation suite", () => {
    const r1 = readFileSync(path.join(ROOT, "AdminPartnersR1ParityPresentation.test.tsx"), "utf8");
    expect(r1).toContain("R1 Partners visual parity");
    const client = readFileSync(CLIENT, "utf8");
    expect(client).toContain("Регистрация и видимость");
    expect(client).not.toContain("Партнёры (реестр)");
  });

  it("renders R1 head + type chips + toolbar filters", async () => {
    render(<AdminPartnersClient />);
    await screen.findByRole("heading", { name: "Партнёры", level: 1 });
    expect(screen.getByText("Регистрация и видимость")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Все типы/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Поиск партнёров")).toBeTruthy();
    expect(screen.getByLabelText("Статус регистрации")).toBeTruthy();
    expect(screen.getByLabelText("Видимость")).toBeTruthy();
    expect(screen.getByLabelText("Город")).toBeTruthy();
    expect(screen.getByLabelText("Записей на странице")).toBeTruthy();
  });

  it("forwards search, city, archive status, and type chip to registry API", async () => {
    const user = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByRole("heading", { name: "Партнёры", level: 1 });
    await waitFor(() => expect(api.fetchPartnerRegistry).toHaveBeenCalled());
    api.fetchPartnerRegistry.mockClear();

    fireEvent.change(screen.getByLabelText("Поиск партнёров"), { target: { value: "красно" } });
    await waitFor(() => expect(api.fetchPartnerRegistry).toHaveBeenCalled(), { timeout: 1500 });
    expect((api.fetchPartnerRegistry.mock.calls.at(-1)?.[0] as URLSearchParams).get("q")).toBe("красно");

    fireEvent.change(screen.getByLabelText("Город"), { target: { value: "Сочи" } });
    fireEvent.change(screen.getByLabelText("Статус регистрации"), { target: { value: "archive" } });
    await waitFor(() => {
      const p = api.fetchPartnerRegistry.mock.calls.at(-1)?.[0] as URLSearchParams;
      expect(p.get("city")).toBe("Сочи");
      expect(p.get("projectArchived")).toBe("true");
    });

    await user.click(screen.getByRole("button", { name: /Агенты/ }));
    await waitFor(() => {
      const p = api.fetchPartnerRegistry.mock.calls.at(-1)?.[0] as URLSearchParams;
      expect(p.get("partnerType")).toBe("AGENT");
    });
  });

  it("prefills registration/type from URL without router.push", async () => {
    nav.params = new URLSearchParams("registration=demo&partnerType=STORE");
    render(<AdminPartnersClient />);
    await waitFor(() => expect(screen.getByLabelText("Статус регистрации")).toHaveValue("demo"));
    expect(screen.getByRole("button", { name: /Магазины/ })).toHaveAttribute("aria-pressed", "true");
    expect(readFileSync(CLIENT, "utf8")).not.toMatch(/router\.push/);
  });
});
